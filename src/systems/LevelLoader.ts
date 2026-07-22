import { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import { BuildingManager } from '../buildings/BuildingManager';
import type { CityPlotConfig, InitialCityPlacementConfig } from '../core/CityMapConfig';
import { createInitialState, GameState } from '../core/GameState';
import type { BuildingSnapshot } from '../core/SaveSchema';
import type { RuleComponentConfig } from '../rules/RuleTypes';
import { CityMapSystem } from './CityMapSystem';
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
  placements?: InitialCityPlacementConfig[];
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

export interface LevelWorldSlotConfig {
  x: number;
  y: number;
  scale?: number;
  depth?: 'far' | 'mid' | 'near';
}

export interface LevelSandboxPresentationConfig {
  startZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  startOffsetX?: number;
  startOffsetY?: number;
}

export interface LevelWorldPresentationConfig {
  theme: 'residential' | 'industrial' | 'green';
  city?: { x: number; y: number; elevation?: number };
  plots?: CityPlotConfig[];
  slots?: LevelWorldSlotConfig[];
  sandbox?: LevelSandboxPresentationConfig;
}

export interface LevelPresentationConfig {
  backgroundAssetId?: string;
  accent?: string;
  briefing?: string[];
  world?: LevelWorldPresentationConfig;
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

const legacyPlots = (level: LevelConfig): CityPlotConfig[] => (
  level.presentation?.world?.slots ?? []
).map((slot, index) => ({
  id: `legacy-plot-${index + 1}`,
  x: slot.x,
  y: slot.y,
  scale: slot.scale,
  depth: slot.depth,
  zone: 'utility',
  accepts: ['generation', 'storage', 'grid']
}));

export class LevelLoader {
  static getWorldPlots(level: LevelConfig): readonly CityPlotConfig[] {
    const configured = level.presentation?.world?.plots;
    return configured?.length ? configured : legacyPlots(level);
  }

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

    CityMapSystem.assignStartingBuildings(
      buildings.getBuildings(),
      this.getWorldPlots(level),
      level.initial.placements
    );

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
    CityMapSystem.assignStartingBuildings(
      buildings.getBuildings(),
      this.getWorldPlots(level),
      level.initial.placements
    );

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
      randomState: savedState.randomState ?? defaults.randomState,
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
