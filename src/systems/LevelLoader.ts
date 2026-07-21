import { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import { BuildingManager } from '../buildings/BuildingManager';
import { createInitialState, GameState } from '../core/GameState';
import type { BuildingSnapshot } from '../core/SaveSchema';
import type { RuleComponentConfig } from '../rules/RuleTypes';
import type { ScenarioConditionGroup } from './ScenarioConditionSystem';
import type { SimulationModifiers } from './SimulationModifiers';

export interface LevelInitialConfig {
  money: number;
  population: number;
  baseDemand: number;
  powerPrice: number;
  satisfaction: number;
  researchPoints: number;
  technologies: string[];
  buildings: string[];
}

export interface LevelCatalogConfig {
  buildings: string[];
  events: string[];
  technologies: string[];
  policies: string[];
}

export interface LevelObjectiveConfig extends ScenarioConditionGroup {
  label: string;
}

export interface LevelFailureConfig extends ScenarioConditionGroup {
  label: string;
}

export interface LevelRulesConfig {
  schemaVersion: 1;
  seed: number;
  tickIntervalMs: number;
  eventTriggerChance: number;
  powerPriceRange: {
    min: number;
    max: number;
  };
  simulationModifiers?: Partial<SimulationModifiers>;
  components: RuleComponentConfig[];
  objective: LevelObjectiveConfig;
  failure: LevelFailureConfig;
}

export interface LevelProgressionConfig {
  requirementMode: 'all' | 'any';
  requiresCompletedLevelIds: string[];
  nextLevelId?: string;
}

export interface LevelPresentationConfig {
  backgroundAssetId?: string;
  accent?: string;
  briefing?: string[];
}

export interface LevelConfig {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  progression: LevelProgressionConfig;
  initial: LevelInitialConfig;
  catalog: LevelCatalogConfig;
  rules: LevelRulesConfig;
  presentation?: LevelPresentationConfig;
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

    for (const buildingId of level.initial.buildings) {
      const config = catalog.get(buildingId);
      if (!config) throw new Error(`Unknown starting building: ${buildingId}`);
      buildings.add(BuildingFactory.create(config));
    }

    const state = createInitialState({
      levelId: level.id,
      cityName: level.name,
      money: level.initial.money,
      population: level.initial.population,
      baseDemand: level.initial.baseDemand,
      powerPrice: level.initial.powerPrice,
      satisfaction: level.initial.satisfaction,
      researchPoints: level.initial.researchPoints,
      unlockedTechnologyIds: level.initial.technologies,
      randomSeed: level.rules.seed
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
      money: level.initial.money,
      population: level.initial.population,
      baseDemand: level.initial.baseDemand,
      powerPrice: level.initial.powerPrice,
      satisfaction: level.initial.satisfaction,
      researchPoints: level.initial.researchPoints,
      unlockedTechnologyIds: level.initial.technologies,
      randomSeed: level.rules.seed
    });
    const state: GameState = {
      ...defaults,
      ...savedState,
      levelId: level.id,
      cityName: level.name,
      randomState: savedState.randomState || defaults.randomState,
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
