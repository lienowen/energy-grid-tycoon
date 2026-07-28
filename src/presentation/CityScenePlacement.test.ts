import { describe, expect, it } from 'vitest';
import buildingData from '../data/buildings.json';
import levelData from '../data/levels.json';
import type { BuildingConfig } from '../buildings/BuildingBase';
import type { GameViewModel } from '../core/GameManager';
import { LevelLoader, type LevelConfig } from '../systems/LevelLoader';
import { neutralSimulationModifiers } from '../systems/SimulationModifiers';
import { CitySceneMapper } from './CitySceneMapper';

const makeView = (): GameViewModel => {
  const level = levelData[0] as unknown as LevelConfig;
  const configs = buildingData as unknown as BuildingConfig[];
  const loaded = LevelLoader.load(level, configs);
  return {
    state: loaded.state,
    level,
    availableBuildings: level.catalog.buildings
      .map((id) => loaded.buildingCatalog.get(id))
      .filter((item): item is BuildingConfig => Boolean(item)),
    technologies: [],
    policies: [],
    buildings: loaded.buildings.getBuildings(),
    upgradeQuotes: {},
    goalProgress: 0,
    telemetry: [],
    modifiers: neutralSimulationModifiers(),
    researchPerHour: 0
  };
};

describe('CityScene placement visuals', () => {
  it('assigns every authored plot one normalized ground asset', () => {
    const scene = CitySceneMapper.map(makeView());
    expect(scene.plots.every((plot) => plot.groundAssetId.startsWith('city01_ground_'))).toBe(true);
    expect(scene.plots.some((plot) => plot.groundAssetId === 'city01_ground_paved')).toBe(true);
    expect(scene.plots.some((plot) => plot.groundAssetId === 'city01_ground_gravel')).toBe(true);
  });

  it('maps legal and illegal targets to placement feedback assets', () => {
    const scene = CitySceneMapper.map(makeView(), 'gas_basic');
    const empty = scene.plots.filter((plot) => !plot.occupied && !plot.locked);
    expect(empty.some((plot) => plot.placementTone === 'valid' || plot.placementTone === 'warning')).toBe(true);
    expect(empty.some((plot) => plot.placementTone === 'invalid')).toBe(true);
    expect(scene.placement?.validPlotIds).toEqual(
      scene.plots.filter((plot) => plot.available).map((plot) => plot.id)
    );
  });

  it('marks initial facilities as completed construction', () => {
    const scene = CitySceneMapper.map(makeView());
    expect(scene.facilities.length).toBeGreaterThan(0);
    expect(scene.facilities.every((facility) => facility.constructionProgress === 1)).toBe(true);
    expect(scene.facilities.every((facility) => facility.underConstruction === false)).toBe(true);
  });
});
