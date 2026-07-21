import { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import { BuildingManager } from '../buildings/BuildingManager';
import { createInitialState, GameState } from '../core/GameState';

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
    const catalog = new Map(buildingConfigs.map((config) => [config.id, config]));
    const buildings = new BuildingManager();

    for (const buildingId of level.startingBuildings) {
      const config = catalog.get(buildingId);
      if (!config) throw new Error(`Unknown starting building: ${buildingId}`);
      buildings.add(BuildingFactory.create(config));
    }

    return {
      config: level,
      state: createInitialState({
        levelId: level.id,
        cityName: level.name,
        money: level.startingMoney,
        population: level.population,
        baseDemand: level.baseDemand,
        powerPrice: level.powerPrice
      }),
      buildings,
      buildingCatalog: catalog
    };
  }
}