import { describe, expect, it } from 'vitest';
import { globalAssetCatalog } from './GlobalAssetCatalog';

describe('GlobalAssetCatalog', () => {
  it('activates the City-01 product district pack through the existing runtime ids', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));

    expect(entries.get('commercial_district_residential_night')?.src)
      .toBe('/assets/city01/product/districts/district-residential-base.png');
    expect(entries.get('commercial_district_commercial_night')?.src)
      .toBe('/assets/city01/product/districts/district-commercial-base.png');
    expect(entries.get('commercial_district_industrial_blackout')?.src)
      .toBe('/assets/city01/product/districts/district-industrial-base.png');
    expect(entries.get('commercial_district_public_night')?.src)
      .toBe('/assets/city01/product/districts/district-public-base.png');
    expect(entries.get('commercial_district_old_town_blackout')?.src)
      .toBe('/assets/city01/product/districts/district-old-town-base.png');
  });

  it('activates the City-01 product facility pack through the commercial runtime ids', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));

    expect(entries.get('commercial_facility_solar_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-solar-farm-base.png');
    expect(entries.get('commercial_facility_wind_offline')?.src)
      .toBe('/assets/city01/product/facilities/facility-wind-farm-base.png');
    expect(entries.get('commercial_facility_gas_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-gas-peaker-base.png');
    expect(entries.get('commercial_facility_battery_offline')?.src)
      .toBe('/assets/city01/product/facilities/facility-battery-storage-base.png');
    expect(entries.get('commercial_facility_substation_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-main-substation-base.png');
  });

  it('keeps runtime asset ids unique after all catalogs are merged', () => {
    const ids = globalAssetCatalog.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
