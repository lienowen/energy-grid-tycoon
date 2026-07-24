import { describe, expect, it } from 'vitest';
import buildingData from '../data/buildings.json';
import levelData from '../data/levels.json';
import type { BuildingConfig } from '../buildings/BuildingBase';
import type { GameViewModel } from '../core/GameManager';
import { LevelLoader, type LevelConfig } from '../systems/LevelLoader';
import { neutralSimulationModifiers } from '../systems/SimulationModifiers';
import { CitySceneMapper } from './CitySceneMapper';
import { toScenePoint } from './CitySceneVisuals';

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
    expect(scene.presentationMode).toBe('city');
    expect(scene.districtPrefabs).toHaveLength(5);
    expect(scene.districtPrefabs?.every((district) => Boolean(district.prefabAssetId))).toBe(true);
    expect(scene.networkNodes?.length).toBeGreaterThanOrEqual(10);
    expect(scene.networkEdges?.length).toBeGreaterThanOrEqual(10);
    expect(scene.networkNodes?.some((node) => node.status === 'planned')).toBe(true);
    expect(scene.ambientBlocks).toHaveLength(0);
  });

  it('uses authored plot anchors for facilities and build targets', () => {
    const scene = CitySceneMapper.map(makeView());
    const solar = scene.facilities.find((facility) => facility.plotId === 'sunrise-neighborhood');
    const wind = scene.facilities.find((facility) => facility.plotId === 'east-coast');
    const gasPlot = scene.plots.find((plot) => plot.id === 'west-industry');
    const solarPoint = toScenePoint({ x: 10, y: 23, elevation: 0.2 });
    const windPoint = toScenePoint({ x: 82, y: 16, elevation: 0.45 });

    expect(solar).toMatchObject({ ...solarPoint, elevation: solarPoint.elevation + 1.1 });
    expect(wind).toMatchObject({ ...windPoint, elevation: windPoint.elevation + 1.1 });
    expect(gasPlot).toMatchObject(toScenePoint({ x: 17, y: 72, elevation: 0.15 }));
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
    expect(scene.camera.panLimitX).toBe(170);
    expect(scene.focus).toEqual(toScenePoint({ x: 54, y: 50, elevation: 0 }));
    expect(scene.camera.minZoom).toBeLessThan(scene.camera.maxZoom);
  });

  it('keeps the procedural presentation camera fallback for later levels', () => {
    const scene = CitySceneMapper.map(makeView(1));
    expect(scene.sceneMode).toBe('procedural');
    expect(scene.camera.startZoom).toBe(1);
    expect(scene.networkNodes).toBeUndefined();
    expect(scene.ambientBlocks.length).toBeGreaterThan(0);
  });
});
