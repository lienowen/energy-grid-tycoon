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
    expect(scene.networkEdges?.some((edge) => edge.id === 'west-to-industrial-tie')).toBe(true);
    expect(scene.networkNodes?.some((node) => node.status === 'planned')).toBe(true);
    expect(scene.ambientBlocks).toHaveLength(0);
  });

  it('uses real grid dispatch for district and line presentation', () => {
    const view = makeView();
    view.lastPower = {
      grossSupply: 100,
      netSupply: 96,
      demand: 100,
      supplyRatio: 0.6,
      shortage: 40,
      surplus: 36,
      energyServed: 60,
      stable: false,
      gridDispatch: {
        servedDemand: 60,
        shortage: 40,
        supplyRatio: 0.6,
        availableSupply: 96,
        curtailedSupply: 36,
        districts: [
          {
            nodeId: 'public-load',
            districtId: 'dawn-public',
            priority: 0,
            demand: 20,
            served: 20,
            supplyRatio: 1
          },
          {
            nodeId: 'industrial-load',
            districtId: 'dawn-industrial',
            priority: 3,
            demand: 25,
            served: 5,
            supplyRatio: 0.2
          }
        ],
        nodes: [
          { nodeId: 'main-substation', flow: 60, capacity: 80, loadRatio: 0.75, status: 'active' },
          { nodeId: 'public-load', flow: 20, capacity: 20, loadRatio: 1, status: 'active' },
          { nodeId: 'industrial-load', flow: 5, capacity: 25, loadRatio: 0.2, status: 'warning' }
        ],
        edges: [
          { edgeId: 'main-to-west', flow: 40, capacity: 80, loadRatio: 0.5, status: 'normal' },
          { edgeId: 'east-to-industrial', flow: 0, capacity: 0, loadRatio: 0, status: 'offline' },
          { edgeId: 'west-to-industrial-tie', flow: 5, capacity: 8, loadRatio: 0.625, status: 'normal' }
        ]
      }
    };

    const scene = CitySceneMapper.map(view, undefined, 'grid');
    expect(scene.districtPrefabs?.find((district) => district.id === 'dawn-public')?.powerRatio)
      .toBe(1);
    expect(scene.districtPrefabs?.find((district) => district.id === 'dawn-industrial')?.powerRatio)
      .toBe(0.2);
    expect(scene.networkNodes?.find((node) => node.id === 'industrial-load')).toMatchObject({
      status: 'warning',
      loadRatio: 0.2
    });
    expect(scene.networkEdges?.find((edge) => edge.id === 'east-to-industrial')).toMatchObject({
      status: 'offline',
      loadRatio: 0
    });
    expect(scene.networkEdges?.find((edge) => edge.id === 'west-to-industrial-tie')).toMatchObject({
      status: 'normal',
      loadRatio: 0.625,
      capacity: 8
    });
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
    expect(scene.camera.startZoom).toBe(1.43);
    expect(scene.camera.panLimitX).toBe(170);
    expect(scene.focus).toEqual(toScenePoint({ x: 53, y: 47, elevation: 0 }));
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
