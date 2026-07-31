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

  it('loads the aligned City-01 split gameplay map layers', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    const land = entries.get('city01_land_base');
    const zones = entries.get('city01_zone_mask');
    const roads = entries.get('city01_road_thin');
    const decor = entries.get('city01_decor_details');
    const ocean = entries.get('city01_ocean_water_base');

    expect(land?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-land-base.svg');
    expect(zones?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-zone-mask.svg');
    expect(roads?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-road-thin.svg');
    expect(decor?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-decor-details.svg');
    expect(ocean?.src)
      .toBe('/assets/city01/product/environment/runtime/ocean-water-base.svg');

    const layers = [land, zones, roads, decor, ocean];
    expect(layers.every((entry) => entry?.width === 2048)).toBe(true);
    expect(layers.every((entry) => entry?.height === 1536)).toBe(true);
    expect(layers.every((entry) => entry?.anchor?.x === 0.5 && entry.anchor.y === 0.5)).toBe(true);

    expect(entries.has('city01_map_base')).toBe(false);
    expect(entries.has('city01_road_network_base')).toBe(false);
    expect(entries.has('city01_ground_details_base')).toBe(false);
  });

  it('keeps source environment and vehicle assets available for later layers', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    expect(entries.get('terrain_road_crossroad_base')?.src)
      .toBe('/assets/city01/product/environment/base/terrain-road-crossroad-base.png');
    expect(entries.get('terrain_harbor_pier_base')?.src)
      .toBe('/assets/city01/product/environment/extended/terrain-harbor-pier-base.png');
    expect(entries.get('vehicle_utility_van')?.src)
      .toBe('/assets/city01/product/vehicles/base/vehicle-utility-van.png');
  });

  it('uses semantically correct single cuts for every City-01 energy family', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    expect(entries.get('commercial_facility_solar_active')?.src)
      .toBe('/assets/single/v1/solar_sheet/solar_sheet__01__base-main.png');
    expect(entries.get('commercial_facility_wind_active')?.src)
      .toBe('/assets/single/v1/wind_sheet/wind_sheet__01__base-main.png');
    expect(entries.get('commercial_facility_gas_active')?.src)
      .toBe('/assets/single/v1/gas_sheet/gas_sheet__01__base-main.png');
    expect(entries.get('commercial_facility_battery_active')?.src)
      .toBe('/assets/single/v1/battery_sheet/battery_sheet__01__base-main.png');
    expect(entries.get('commercial_facility_battery_utility_active')?.src)
      .toBe('/assets/single/v1/battery_utility_sheet/battery_utility_sheet__01__base-main.png');
    expect(entries.get('commercial_facility_substation_active')?.src)
      .toBe('/assets/single/v1/substation_sheet/substation_sheet__01__base-main.png');
    expect(entries.get('world_facility_grid_node_active')?.src)
      .toBe('/assets/single/v1/tower_sheet/tower_sheet__01__base-main.png');
  });

  it('registers only the approved ground placement and effect support cuts', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    expect(entries.get('city01_ground_grass')?.src)
      .toBe('/assets/single/v1/ground_sheet/ground_sheet__01__grass-lot.png');
    expect(entries.get('city01_ground_paved')?.src)
      .toBe('/assets/single/v1/ground_sheet/ground_sheet__02__paved-lot-a.png');
    expect(entries.get('city01_placement_valid')?.src)
      .toBe('/assets/single/v1/build_sheet/build_sheet__11__small-bar-f.png');
    expect(entries.get('city01_placement_invalid')?.src)
      .toBe('/assets/single/v1/build_sheet/build_sheet__18__small-bar-j.png');
    expect(entries.get('city01_fx_smoke_dark')?.src)
      .toBe('/assets/single/v1/gas_sheet/gas_sheet__06__smoke-white.png');
    expect(entries.get('city01_fx_energize')?.src)
      .toBe('/assets/single/v1/substation_sheet/substation_sheet__04__energize-fx.png');
  });

  it('removes the mislabeled legacy facility directory from the runtime catalog', () => {
    expect(globalAssetCatalog.entries.some((entry) =>
      entry.src.startsWith('/assets/city01/product/facilities/')
    )).toBe(false);
  });

  it('gives every unified facility entry one 512 canvas and one anchor contract', () => {
    const facilities = globalAssetCatalog.entries.filter((entry) =>
      entry.tags?.includes('unified-runtime-v1')
    );
    expect(facilities.length).toBeGreaterThanOrEqual(27);
    for (const facility of facilities) {
      expect(facility.width).toBe(512);
      expect(facility.height).toBe(512);
      expect(facility.anchor).toEqual({ x: 0.5, y: 0.9115 });
      expect(facility.src.startsWith('/assets/single/v1/')).toBe(true);
    }
  });

  it('gives support cuts their category-specific normalized canvas contract', () => {
    const support = globalAssetCatalog.entries.filter((entry) =>
      entry.tags?.includes('unified-support-v1')
    );
    expect(support).toHaveLength(12);
    for (const entry of support) {
      expect(entry.width).toBe(512);
      expect([256, 512]).toContain(entry.height);
      expect(entry.src.startsWith('/assets/single/v1/')).toBe(true);
    }
  });

  it('keeps runtime asset ids unique after all catalogs are merged', () => {
    const ids = globalAssetCatalog.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
