import { describe, expect, it } from 'vitest';
import { FacilityVisualRegistry } from '../presentation/visuals/FacilityVisualRegistry';
import { globalAssetCatalog } from './GlobalAssetCatalog';

const entryById = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));

describe('City-01 product asset integration', () => {
  it('keeps one final entry per runtime asset id', () => {
    expect(new Set(globalAssetCatalog.entries.map((entry) => entry.id)).size)
      .toBe(globalAssetCatalog.entries.length);
  });

  it('redirects authored district runtime ids to the submitted PNG pack', () => {
    expect(entryById.get('commercial_district_residential_night')?.src)
      .toBe('/assets/city01/product/districts/district-residential-base.png');
    expect(entryById.get('commercial_district_commercial_night')?.src)
      .toBe('/assets/city01/product/districts/district-commercial-base.png');
    expect(entryById.get('commercial_district_industrial_night')?.src)
      .toBe('/assets/city01/product/districts/district-industrial-base.png');
    expect(entryById.get('commercial_district_public_night')?.src)
      .toBe('/assets/city01/product/districts/district-public-base.png');
    expect(entryById.get('commercial_district_old_town_night')?.src)
      .toBe('/assets/city01/product/districts/district-old-town-base.png');
  });

  it('uses the same base art for blackout and lets Pixi render the state', () => {
    expect(entryById.get('commercial_district_residential_blackout')?.src)
      .toBe(entryById.get('commercial_district_residential_night')?.src);
    expect(entryById.get('commercial_facility_solar_offline')?.src)
      .toBe(entryById.get('commercial_facility_solar_active')?.src);
  });

  it('resolves commercial facilities to the submitted product sprites', () => {
    expect(FacilityVisualRegistry.resolve({
      configId: 'solar_basic',
      category: 'generation',
      enabled: true,
      selected: false,
      constructionProgress: 1,
      presentation: 'commercial'
    }).bodyAssetId).toBe('facility_solar_farm_base');

    expect(FacilityVisualRegistry.resolve({
      configId: 'battery_basic',
      category: 'storage',
      enabled: true,
      selected: false,
      constructionProgress: 1,
      presentation: 'commercial'
    }).bodyAssetId).toBe('facility_battery_storage_base');
  });

  it('uses submitted gas and battery art in the real build dock', () => {
    expect(entryById.get('building_gas')?.src)
      .toBe('/assets/city01/product/facilities/facility-gas-peaker-base.png');
    expect(entryById.get('building_battery')?.src)
      .toBe('/assets/city01/product/facilities/facility-battery-storage-base.png');
    expect(entryById.get('building_battery_utility')?.src)
      .toBe('/assets/city01/product/facilities/facility-battery-storage-base.png');
  });

  it('redirects main and distribution substations to the product pack', () => {
    expect(entryById.get('commercial_facility_substation_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-main-substation-base.png');
    expect(entryById.get('world_facility_grid_node_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-distribution-node-base.png');
  });
});
