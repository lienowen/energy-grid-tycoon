import { describe, expect, it } from 'vitest';
import type { CitySceneState } from '../CitySceneTypes';
import { buildCity01AccessRoads } from './City01RoadTopology';

const state = {
  trafficDensity: 0.6,
  roads: [
    {
      id: 'backbone-horizontal',
      points: [
        { x: -20, z: 0, elevation: 0 },
        { x: 0, z: 0, elevation: 0 },
        { x: 20, z: 0, elevation: 0 }
      ],
      laneCount: 2,
      traffic: 0.6,
      powered: true
    },
    {
      id: 'backbone-vertical',
      points: [
        { x: 0, z: -18, elevation: 0 },
        { x: 0, z: 0, elevation: 0 },
        { x: 0, z: 18, elevation: 0 }
      ],
      laneCount: 1,
      traffic: 0.4,
      powered: true
    }
  ],
  districtPrefabs: [
    {
      id: 'district-a',
      kind: 'residential',
      x: 18,
      z: 7,
      elevation: 0,
      label: 'A',
      width: 10,
      depth: 10,
      scale: 1,
      buildingCount: 4,
      variant: 1,
      powerRatio: 1,
      status: 'normal'
    }
  ],
  facilities: [
    {
      instanceId: 'facility-a',
      configId: 'solar_basic',
      plotId: 'plot-a',
      name: 'Solar',
      assetId: 'solar',
      category: 'generation',
      enabled: true,
      level: 1,
      scale: 1,
      output: 10,
      storageRatio: 0,
      x: -16,
      z: -8,
      elevation: 0
    }
  ]
} as unknown as CitySceneState;

describe('City01RoadTopology', () => {
  it('keeps only short access roads and rejects long facility connectors', () => {
    const access = buildCity01AccessRoads(state);
    expect(access).toHaveLength(1);
    expect(access[0]?.id).toBe('district-access-district-a');
    expect(access[0]?.points).toHaveLength(2);
  });

  it('projects access roads onto a real backbone segment instead of a distant vertex', () => {
    const access = buildCity01AccessRoads(state);
    const start = access[0]?.points[0];
    expect(start).toMatchObject({ x: 18, z: 0 });
  });
});
