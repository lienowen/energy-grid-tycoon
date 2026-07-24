import { describe, expect, it } from 'vitest';
import type { FacilitySceneState } from './CitySceneTypes';
import { planCommercialFacilities } from './CommercialLandmarkPlanner';

const facility = (
  instanceId: string,
  configId: string,
  x: number,
  z: number,
  output: number
): FacilitySceneState => ({
  instanceId,
  configId,
  plotId: `${instanceId}-plot`,
  name: instanceId,
  assetId: '',
  category: configId.includes('battery') ? 'storage' : 'generation',
  enabled: true,
  level: 1,
  scale: 1,
  output,
  storageRatio: 0,
  x,
  z,
  elevation: 1
});

describe('CommercialLandmarkPlanner', () => {
  it('turns adjacent solar units into one readable landmark', () => {
    const source = [
      facility('solar-a', 'solar_basic', 10, 20, 180),
      facility('solar-b', 'solar_basic', 20, 30, 180),
      facility('wind-a', 'wind_basic', 60, 20, 260)
    ];

    const planned = planCommercialFacilities(source);
    expect(planned).toHaveLength(2);
    expect(planned[0]).toMatchObject({
      configId: 'solar_basic',
      name: '曙光光伏场',
      x: 15,
      z: 25,
      output: 360
    });
    expect(planned[0]?.scale).toBeGreaterThan(1.3);
    expect(planned[1]?.configId).toBe('wind_basic');
    expect(source).toHaveLength(3);
  });

  it('leaves a single solar facility unchanged', () => {
    const source = [facility('solar-a', 'solar_basic', 10, 20, 180)];
    expect(planCommercialFacilities(source)).toEqual(source);
  });
});
