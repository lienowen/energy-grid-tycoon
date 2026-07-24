import { describe, expect, it } from 'vitest';
import type { CitySceneState } from './CitySceneTypes';
import { planCommercialCityLife } from './CommercialCityLifePlanner';

const makeState = (overrides: Partial<CitySceneState> = {}): CitySceneState => ({
  levelId: 'city-01',
  cityName: '曙光新城',
  theme: 'residential',
  accent: '#4ad7ff',
  day: 1,
  hour: 20,
  population: 12000,
  satisfaction: 62,
  pollutionRatio: 0.2,
  supplyRatio: 0.48,
  blackoutIntensity: 0.7,
  trafficDensity: 0.5,
  city: { x: 50, z: 50, elevation: 0 },
  camera: {
    startZoom: 1,
    minZoom: 0.7,
    maxZoom: 2,
    startOffsetX: 0,
    startOffsetY: 0
  },
  presentationMode: 'city',
  districts: [],
  districtPrefabs: [
    {
      id: 'residential',
      label: '居住区',
      kind: 'residential',
      x: 42,
      z: 27,
      elevation: 0,
      width: 20,
      depth: 16,
      scale: 1,
      buildingCount: 6,
      variant: 11,
      powerRatio: 0.42,
      status: 'blackout'
    },
    {
      id: 'commercial',
      label: '商业区',
      kind: 'commercial',
      x: 43,
      z: 52,
      elevation: 0,
      width: 22,
      depth: 17,
      scale: 1,
      buildingCount: 6,
      variant: 23,
      powerRatio: 1,
      status: 'normal'
    }
  ],
  plots: [],
  facilities: [],
  links: [],
  roads: [
    {
      id: 'dawn-central-boulevard',
      points: [
        { x: 20, z: 44, elevation: -0.2 },
        { x: 50, z: 44, elevation: -0.2 },
        { x: 84, z: 52, elevation: -0.2 }
      ],
      laneCount: 2,
      traffic: 0.7,
      powered: true
    },
    {
      id: 'dawn-south-boulevard',
      points: [
        { x: 22, z: 68, elevation: -0.2 },
        { x: 58, z: 64, elevation: -0.2 }
      ],
      laneCount: 2,
      traffic: 0.55,
      powered: false
    }
  ],
  ambientBlocks: [],
  ...overrides
});

describe('CommercialCityLifePlanner', () => {
  it('creates a continuous authored city carpet for Dawn City', () => {
    const plan = planCommercialCityLife(makeState());
    expect(plan.fabric.map((patch) => patch.tone)).toEqual([
      'core',
      'waterfront',
      'service',
      'greenway'
    ]);
    expect(plan.fabric.every((patch) => patch.points.length >= 6)).toBe(true);
  });

  it('adds bounded street life without overwhelming the city view', () => {
    const plan = planCommercialCityLife(makeState());
    expect(plan.streetLights.length).toBeGreaterThan(0);
    expect(plan.streetLights.length).toBeLessThanOrEqual(30);
    expect(plan.vehicles.length).toBeGreaterThan(0);
    expect(plan.vehicles.length).toBeLessThanOrEqual(11);
    expect(plan.streetLights.some((light) => light.lit)).toBe(true);
  });

  it('removes moving traffic from diagnostics while preserving city structure', () => {
    const plan = planCommercialCityLife(makeState({ presentationMode: 'grid' }));
    expect(plan.fabric).toHaveLength(4);
    expect(plan.streetLights.length).toBeGreaterThan(0);
    expect(plan.vehicles).toHaveLength(0);
  });

  it('only creates recovery pulses for districts that need attention', () => {
    const plan = planCommercialCityLife(makeState());
    expect(plan.recovery).toHaveLength(1);
    expect(plan.recovery[0]).toMatchObject({ id: 'residential-recovery', status: 'blackout' });
  });

  it('does not apply the commercial city layer to later procedural levels', () => {
    const plan = planCommercialCityLife(makeState({ levelId: 'city-02' }));
    expect(plan).toEqual({ fabric: [], streetLights: [], vehicles: [], recovery: [] });
  });
});
