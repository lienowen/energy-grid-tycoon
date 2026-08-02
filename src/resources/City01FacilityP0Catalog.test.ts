import { describe, expect, it } from 'vitest';
import { city01FacilityP0Catalog } from './City01FacilityP0Catalog';

const byId = new Map(city01FacilityP0Catalog.entries.map((entry) => [entry.id, entry]));

describe('City01FacilityP0Catalog', () => {
  it('registers active body and component roles for wind, gas and storage', () => {
    expect([...byId.keys()]).toEqual(expect.arrayContaining([
      'commercial_facility_wind_p0_body',
      'commercial_facility_wind_p0_motion',
      'commercial_facility_gas_p0_body',
      'commercial_facility_gas_p0_effect',
      'commercial_facility_battery_p0_body',
      'commercial_facility_battery_p0_light',
      'commercial_facility_battery_utility_p0_body',
      'commercial_facility_battery_utility_p0_light'
    ]));
  });

  it('keeps the exact 1024 source canvas and shared City01 anchor', () => {
    for (const entry of city01FacilityP0Catalog.entries) {
      expect(entry.kind).toBe('image');
      expect(entry.width).toBe(1024);
      expect(entry.height).toBe(1024);
      expect(entry.anchor).toEqual({ x: 0.5, y: 0.9115 });
      expect(entry.tags).toContain('layered-p0');
    }
  });

  it('derives the aligned wind rotor from the exact wind body source', () => {
    expect(byId.get('commercial_facility_wind_p0_motion')?.src)
      .toBe(byId.get('commercial_facility_wind_p0_body')?.src);
  });
});
