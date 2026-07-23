import { describe, expect, it } from 'vitest';
import buildingData from '../data/buildings.json';
import levelData from '../data/levels.json';
import type { BuildingConfig } from '../buildings/BuildingBase';
import type { GameViewModel } from '../core/GameManager';
import { LevelLoader, type LevelConfig } from '../systems/LevelLoader';
import { neutralSimulationModifiers } from '../systems/SimulationModifiers';
import { CitySceneMapper } from './CitySceneMapper';

const makeView = (levelIndex = 0): GameViewModel => {
  const level = levelData[levelIndex] as unknown as LevelConfig;
  const buildings = buildingData as unknown as BuildingConfig[];
  const loaded = LevelLoader.load(level, buildings);
  loaded.state.supplyRatio = 0.72;
  loaded.state.pollution = 18;
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

describe('CitySceneMapper', () => {
  it('keeps simulation state separate while producing a complete visual scene', () => {
    const view = makeView();
    const scene = CitySceneMapper.map(view);

    expect(scene.levelId).toBe(view.level.id);
    expect(scene.facilities).toHaveLength(view.buildings.length);
    expect(scene.links).toHaveLength(scene.facilities.length);
    expect(scene.plots.some((plot) => plot.occupied)).toBe(true);
    expect(scene.districts.length).toBeGreaterThan(1);
    expect(scene.supplyRatio).toBe(0.72);
    expect(scene.sceneMode).toBe('authored');
    expect(scene.districtPrefabs).toHaveLength(5);
    expect(scene.ambientBlocks).toHaveLength(0);
  });

  it('marks only legal empty plots when the player chooses a facility', () => {
    const view = makeView();
    const scene = CitySceneMapper.map(view, 'gas_basic');

    expect(scene.placement?.buildingId).toBe('gas_basic');
    expect(scene.placement?.validPlotIds.length).toBeGreaterThan(0);
    for (const plot of scene.plots.filter((item) => item.available)) {
      expect(plot.occupied).toBe(false);
      expect(plot.locked).toBe(false);
    }
  });

  it('uses the authored camera composition for Dawn City', () => {
    const scene = CitySceneMapper.map(makeView());
    expect(scene.camera.startZoom).toBe(1.34);
    expect(scene.camera.minZoom).toBeLessThan(scene.camera.maxZoom);
  });

  it('keeps the procedural presentation camera fallback for later levels', () => {
    const scene = CitySceneMapper.map(makeView(1));
    expect(scene.sceneMode).toBe('procedural');
    expect(scene.camera.startZoom).toBe(1);
    expect(scene.ambientBlocks.length).toBeGreaterThan(0);
  });
});
