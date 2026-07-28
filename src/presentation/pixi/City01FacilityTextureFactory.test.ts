import { describe, expect, it } from 'vitest';
import {
  city01FacilitySubjectScale,
  isCity01FacilityRuntimeAsset
} from './City01FacilityTextureFactory';

describe('City01FacilityTextureFactory', () => {
  it('routes City-01 generation, storage and grid assets through cached scaling', () => {
    expect(isCity01FacilityRuntimeAsset('commercial_facility_solar_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_wind_offline')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_battery_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_facility_substation_active')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('world_facility_grid_node_overload')).toBe(true);
    expect(isCity01FacilityRuntimeAsset('commercial_district_residential_night')).toBe(false);
  });

  it('keeps energy facilities subordinate to districts', () => {
    expect(city01FacilitySubjectScale('commercial_facility_solar_active')).toBe(0.78);
    expect(city01FacilitySubjectScale('commercial_facility_wind_active')).toBe(0.8);
    expect(city01FacilitySubjectScale('commercial_facility_gas_active')).toBe(0.78);
    expect(city01FacilitySubjectScale('commercial_facility_battery_active')).toBe(0.78);
  });

  it('makes substations and distribution nodes the smallest infrastructure subjects', () => {
    expect(city01FacilitySubjectScale('commercial_facility_substation_active')).toBe(0.74);
    expect(city01FacilitySubjectScale('world_facility_grid_node_active')).toBe(0.68);
  });
});
