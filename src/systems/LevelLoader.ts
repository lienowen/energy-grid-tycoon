import { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import { BuildingManager } from '../buildings/BuildingManager';
import { createInitialState, GameState } from '../core/GameState';
import type { BuildingSnapshot } from '../core/SaveSchema';

export interface LevelGoal {
  type: 'money' | 'satisfaction' | 'population';
  target: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  startingMoney: number;
  population: number;
  baseDemand: number;
  powerPrice: number;
  availableBuildings: string[];
  startingBuildings: string[];
  eventPool: string[];
  goal: LevelGoal;
  failMoney: number;
  startingResearchPoints?: number;
  startingTechnologies?: string[];
  availableTechnologies?: string[];
  availablePolicies?: string[];
}

export interface LoadedLevel {
  config: LevelConfig;
  state: GameState;
  buildings: BuildingManager;
  buildingCatalog: Map<string, BuildingConfig>;
}

export class LevelLoader {
  static load(
    level: LevelConfig,
    buildingConfigs: BuildingConfig[]
  ): LoadedLevel {
    const catalog = this.createCatalog(buildingConfigs);
    const buildings = new BuildingManager();

    for (const buildingId of level.startingBuildings) {
      const config = catalog.get(buildingId);
      if (!config) throw new Error(`Unknown starting building: ${buildingId}`);
      buildings.add(BuildingFactory.create(config));
    }

    const state = createInitialState({
      levelId: level.id,
      cityName: level.name,
      money: level.startingMoney,
      population: level.population,
      baseDemand: level.baseDemand,
      powerPrice: level.powerPrice,
      researchPoints: level.startingResearchPoints,
      unlockedTechnologyIds: level.startingTechnologies
    });

    state.storageEnergy = buildings.getTotalStoredEnergy();
    state.storageCapacity = buildings.getTotalStorageCapacity();

    return { config: level, state, buildings, buildingCatalog: catalog };
  }

  static restore(
    level: LevelConfig,
    buildingConfigs: BuildingConfig[],
    savedState: GameState,
    snapshots: BuildingSnapshot[]
  ): LoadedLevel {
    const catalog = this.createCatalog(buildingConfigs);
    const buildings = BuildingManager.restore(snapshots, catalog);
    const defaults = createInitialState({
      levelId: level.id,
      cityName: level.name,
      money: level.startingMoney,
      population: level.population,
      baseDemand: level.baseDemand,
      powerPrice: level.powerPrice,
      researchPoints: level.startingResearchPoints,
      unlockedTechnologyIds: level.startingTechnologies
    });
    const state: GameState = {
      ...defaults,
      ...savedState,
      levelId: level.id,
      cityName: level.name,
      unlockedTechnologyIds: [...new Set(savedState.unlockedTechnologyIds ?? defaults.unlockedTechnologyIds)],
      storageEnergy: buildings.getTotalStoredEnergy(),
      storageCapacity: buildings.getTotalStorageCapacity()
    };

    return { config: level, state, buildings, buildingCatalog: catalog };
  }

  private static createCatalog(buildingConfigs: BuildingConfig[]): Map<string, BuildingConfig> {
    return new Map(buildingConfigs.map((config) => [config.id, config]));
  }
}
