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
  it('adds one connected access road for every district and facility', () => {
    const access = buildCity01AccessRoads(state);
    expect(access).toHaveLength(2);
    expect(access.map((road) => road.id)).toEqual([
      'district-access-district-a',
      'facility-access-facility-a'
    ]);
    expect(access.every((road) => road.points.length === 2)).toBe(true);
  });

  it('anchors each access road to an existing backbone point', () => {
    const backboneKeys = new Set(
      state.roads.flatMap((road) => road.points.map((point) => `${point.x}:${point.z}`))
    );
    for (const road of buildCity01AccessRoads(state)) {
      const start = road.points[0]!;
      expect(backboneKeys.has(`${start.x}:${start.z}`)).toBe(true);
    }
  });
});
