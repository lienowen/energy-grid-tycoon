import { describe, expect, it } from 'vitest';
import type { CitySceneState } from '../CitySceneTypes';
import {
  buildCity01AccessRoads,
  city01RoadEdges,
  city01RoadNodes,
  validateCity01RoadTopology
} from './City01RoadTopology';

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
  it('passes the explicit topology quality gate', () => {
    expect(validateCity01RoadTopology()).toEqual([]);
  });

  it('declares unique nodes and edges with five reachable district entrances', () => {
    expect(new Set(city01RoadNodes.map((node) => node.id)).size).toBe(city01RoadNodes.length);
    expect(new Set(city01RoadEdges.map((edge) => edge.id)).size).toBe(city01RoadEdges.length);
    expect(city01RoadNodes.filter((node) => node.kind === 'district-entry')).toHaveLength(5);
  });

  it('limits access roads to one standard tile and does not mark normal links as dead ends', () => {
    const accessEdges = city01RoadEdges.filter((edge) => edge.roadClass === 'access');
    expect(accessEdges).toHaveLength(5);
    expect(accessEdges.every((edge) => edge.maxAccessLength <= 20)).toBe(true);
    expect(accessEdges.every((edge) => edge.isDeadEnd === false)).toBe(true);
  });

  it('keeps compatibility access lines short and rejects distant facilities', () => {
    const access = buildCity01AccessRoads(state);
    expect(access).toHaveLength(1);
    expect(access[0]?.id).toBe('district-access-district-a');
    expect(access[0]?.points[0]).toMatchObject({ x: 18, z: 0 });
  });

  it('returns no vector access roads when the active tile renderer clears simulation roads', () => {
    expect(buildCity01AccessRoads({ ...state, roads: [] })).toEqual([]);
  });
});
