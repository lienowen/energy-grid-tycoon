import { describe, expect, it } from 'vitest';
import {
  CITY01_FACILITY_CANVAS,
  city01FacilityCanvasSpec,
  city01FacilityCleanupSpec,
  city01FacilitySubjectScale,
  isCity01FacilityRuntimeAsset
} from './City01FacilityTextureFactory';

describe('City01FacilityTextureFactory', () => {
  it('routes every approved City-01 facility family through one cached normalizer', () => {
    expect(isCity01FacilityRuntimeAsset('commercial_facility_solar_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_wind_offline')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_battery_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_battery_utility_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_substation_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('world_facility_grid_node_overload')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_district_residential_night')).toBe(false);
  });

  it('uses one 512 square canvas and one bottom ground line for all facility states', () => {
    expect(CITY01_FACILITY_CANVAS).toEqual({
      width: 512,
      height: 512,
      anchorY: 0.9115,
      baseline: 467
    });
  });

  it('keeps family-specific subject boxes while preserving the shared canvas contract', () => {
    expect(city01FacilityCanvasSpec('commercial_facility_solar_active'))
      .toEqual({ maxSubjectWidth: 430, maxSubjectHeight: 360 });
    expect(city01FacilityCanvasSpec('commercial_facility_wind_active'))
      .toEqual({ maxSubjectWidth: 300, maxSubjectHeight: 430 });
    expect(city01FacilityCanvasSpec('commercial_facility_battery_utility_active'))
      .toEqual({ maxSubjectWidth: 448, maxSubjectHeight: 350 });
    expect(city01FacilityCanvasSpec('world_facility_grid_node_active'))
      .toEqual({ maxSubjectWidth: 318, maxSubjectHeight: 420 });
  });

  it('uses conservative per-family cleanup instead of removing opaque building pixels', () => {
    const wind = city01FacilityCleanupSpec('commercial_facility_wind_active');
    const gas = city01FacilityCleanupSpec('commercial_facility_gas_active');
    const battery = city01FacilityCleanupSpec('commercial_facility_battery_active');

    expect(wind.startYRatio).toBeGreaterThanOrEqual(0.7);
    expect(wind.maxAlpha).toBeLessThan(200);
    expect(wind.alphaMultiplier).toBeLessThan(gas.alphaMultiplier);
    expect(gas.maxAlpha).toBeLessThan(160);
    expect(battery.maxAlpha).toBeLessThan(140);
    expect(battery.alphaMultiplier).toBeGreaterThan(0);
  });

  it('reports the visual width ratio from the normalized canvas instead of old source dimensions', () => {
    expect(city01FacilitySubjectScale('commercial_facility_solar_active')).toBeCloseTo(430 / 512);
    expect(city01FacilitySubjectScale('commercial_facility_wind_active')).toBeCloseTo(300 / 512);
    expect(city01FacilitySubjectScale('commercial_facility_substation_active')).toBeCloseTo(446 / 512);
    expect(city01FacilitySubjectScale('world_facility_grid_node_active')).toBeCloseTo(318 / 512);
  });
});
