import { describe, expect, it } from 'vitest';
import { resolveFacilityModelKind } from './FacilityModelRenderer';

describe('FacilityModelRenderer registry', () => {
  it('maps every current facility family to a dedicated model', () => {
    expect(resolveFacilityModelKind('solar_basic')).toBe('solar');
    expect(resolveFacilityModelKind('wind_basic')).toBe('wind');
    expect(resolveFacilityModelKind('gas_basic')).toBe('gas');
    expect(resolveFacilityModelKind('battery_basic')).toBe('battery');
    expect(resolveFacilityModelKind('battery_utility')).toBe('batteryCampus');
    expect(resolveFacilityModelKind('wind_offshore')).toBe('offshoreWind');
    expect(resolveFacilityModelKind('nuclear_advanced')).toBe('nuclear');
  });

  it('keeps unknown future facilities playable with a generic city model', () => {
    expect(resolveFacilityModelKind('future_hydrogen_hub')).toBe('generic');
  });
});
