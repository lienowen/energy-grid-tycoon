import { describe, expect, it } from 'vitest';
import {
  CITY01_FACILITY_CANVAS,
  city01FacilityCanvasSpec,
  city01FacilityCleanupSpec,
  city01FacilitySubjectScale,
  isCity01FacilityRuntimeAsset,
  isCity01P0FacilityAsset
} from './City01FacilityTextureFactory';

describe('City01FacilityTextureFactory', () => {
  it('routes approved static and P0 facility assets through one cached factory', () => {
    expect(isCity01FacilityRuntimeAsset('commercial_facility_solar_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_wind_p0_body')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_gas_p0_effect')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_battery_utility_p0_light')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('world_facility_grid_node_overload')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_district_residential_night')).toBe(false);
  });

  it('recognizes only the new layered runtime ids as P0 assets', () => {
    expect(isCity01P0FacilityAsset('commercial_facility_wind_p0_body')).toBe(true);
    expect(isCity01P0FacilityAsset('commercial_facility_battery_p0_light')).toBe(true);
    expect(isCity01P0FacilityAsset('commercial_facility_wind_active')).toBe(false);
  });

  it('uses one 512 square canvas and one bottom ground line for shared layers', () => {
    expect(CITY01_FACILITY_CANVAS).toEqual({
      width: 512,
      height: 512,
      anchorY: 0.9115,
      baseline: 467
    });
  });

  it('keeps family-specific subject boxes for legacy state cuts', () => {
    expect(city01FacilityCanvasSpec('commercial_facility_solar_active'))
      .toEqual({ maxSubjectWidth: 430, maxSubjectHeight: 360 });
    expect(city01FacilityCanvasSpec('commercial_facility_wind_active'))
      .toEqual({ maxSubjectWidth: 300, maxSubjectHeight: 430 });
    expect(city01FacilityCanvasSpec('commercial_facility_battery_utility_active'))
      .toEqual({ maxSubjectWidth: 448, maxSubjectHeight: 350 });
    expect(city01FacilityCanvasSpec('world_facility_grid_node_active'))
      .toEqual({ maxSubjectWidth: 318, maxSubjectHeight: 420 });
  });

  it('uses conservative cleanup only for legacy baked shadow fringes', () => {
    const wind = city01FacilityCleanupSpec('commercial_facility_wind_active');
    const gas = city01FacilityCleanupSpec('commercial_facility_gas_active');
    const battery = city01FacilityCleanupSpec('commercial_facility_battery_active');

    expect(wind.startYRatio).toBeGreaterThanOrEqual(0.7);
    expect(wind.maxAlpha).toBeLessThan(200);
    expect(wind.alphaMultiplier).toBeLessThan(gas.alphaMultiplier);
    expect(gas.maxAlpha).toBeLessThan(160);
    expect(battery.maxAlpha).toBeLessThan(140);
  });

  it('reports the legacy visual width ratio from the normalized canvas', () => {
    expect(city01FacilitySubjectScale('commercial_facility_solar_active')).toBeCloseTo(430 / 512);
    expect(city01FacilitySubjectScale('commercial_facility_wind_active')).toBeCloseTo(300 / 512);
    expect(city01FacilitySubjectScale('commercial_facility_substation_active')).toBeCloseTo(446 / 512);
    expect(city01FacilitySubjectScale('world_facility_grid_node_active')).toBeCloseTo(318 / 512);
  });
});
