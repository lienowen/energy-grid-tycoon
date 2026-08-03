import { describe, expect, it } from 'vitest';
import generatorSource from './City01FacilityV2Generator.ts?raw';
import {
  CITY01_FACILITY_V2_CONTRACT,
  city01FacilityV2Asset,
  isCity01FacilityV2Asset
} from './City01FacilityV2Generator';

describe('City01FacilityV2Generator', () => {
  it('recognizes every core facility and authored state', () => {
    expect(city01FacilityV2Asset('commercial_facility_solar_active'))
      .toEqual({ kind: 'solar', state: 'active' });
    expect(city01FacilityV2Asset('commercial_facility_wind_construction'))
      .toEqual({ kind: 'wind', state: 'construction' });
    expect(city01FacilityV2Asset('commercial_facility_gas_fault'))
      .toEqual({ kind: 'gas', state: 'fault' });
    expect(city01FacilityV2Asset('commercial_facility_battery_offline'))
      .toEqual({ kind: 'battery', state: 'offline' });
    expect(city01FacilityV2Asset('commercial_facility_battery_utility_active'))
      .toEqual({ kind: 'battery_utility', state: 'active' });
    expect(city01FacilityV2Asset('commercial_facility_substation_fault'))
      .toEqual({ kind: 'substation', state: 'fault' });
  });

  it('does not intercept layered P0 components or unrelated assets', () => {
    expect(isCity01FacilityV2Asset('commercial_facility_wind_p0_body')).toBe(false);
    expect(isCity01FacilityV2Asset('commercial_facility_gas_component_effect')).toBe(false);
    expect(isCity01FacilityV2Asset('world_facility_grid_node_active')).toBe(false);
    expect(isCity01FacilityV2Asset('commercial_district_industrial_night')).toBe(false);
  });

  it('uses one shared transparent canvas and four geometry states', () => {
    expect(CITY01_FACILITY_V2_CONTRACT.canvasWidth).toBe(512);
    expect(CITY01_FACILITY_V2_CONTRACT.canvasHeight).toBe(512);
    expect(CITY01_FACILITY_V2_CONTRACT.anchorY).toBe(0.9115);
    expect(CITY01_FACILITY_V2_CONTRACT.baseline).toBe(467);
    expect(CITY01_FACILITY_V2_CONTRACT.generatedKinds).toEqual([
      'solar',
      'wind',
      'gas',
      'battery',
      'battery_utility',
      'substation'
    ]);
    expect(CITY01_FACILITY_V2_CONTRACT.states).toEqual([
      'active',
      'construction',
      'offline',
      'fault'
    ]);
    expect(CITY01_FACILITY_V2_CONTRACT.hardRectangularBase).toBe(false);
    expect(CITY01_FACILITY_V2_CONTRACT.bakedText).toBe(false);
    expect(CITY01_FACILITY_V2_CONTRACT.stateSpecificGeometry).toBe(true);
  });

  it('contains distinct facility compositions and state feedback', () => {
    for (const drawer of [
      'drawSolar',
      'drawWind',
      'drawGas',
      'drawBattery',
      'drawBatteryUtility',
      'drawSubstation',
      'drawConstruction',
      'drawFaultMarks'
    ]) {
      expect(generatorSource).toContain(drawer);
    }
    expect(generatorSource).not.toContain('fillText(');
  });
});
