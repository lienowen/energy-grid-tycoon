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

  it('loads aligned City-01 base, road and decoration layers', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    const baseMap = entries.get('city01_map_base');
    const roadNetwork = entries.get('city01_road_network_base');
    const groundDetails = entries.get('city01_ground_details_base');

    expect(baseMap?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-map-base.svg');
    expect(roadNetwork?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-road-network.svg');
    expect(groundDetails?.src)
      .toBe('/assets/city01/product/environment/runtime/city01-ground-details.svg');
    expect(baseMap?.width).toBe(2048);
    expect(baseMap?.height).toBe(1536);
    expect(roadNetwork?.width).toBe(baseMap?.width);
    expect(roadNetwork?.height).toBe(baseMap?.height);
    expect(groundDetails?.width).toBe(baseMap?.width);
    expect(groundDetails?.height).toBe(baseMap?.height);
    expect(baseMap?.anchor).toEqual({ x: 0.5, y: 0.5 });
    expect(roadNetwork?.anchor).toEqual(baseMap?.anchor);
    expect(groundDetails?.anchor).toEqual(baseMap?.anchor);
    expect(baseMap?.preload).toBe('level');
    expect(roadNetwork?.preload).toBe('level');
    expect(groundDetails?.preload).toBe('level');
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

  it('corrects the mislabeled product facility files through semantic runtime ids', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    expect(entries.get('commercial_facility_solar_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-distribution-node-base.png');
    expect(entries.get('commercial_facility_wind_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-gas-peaker-base.png');
    expect(entries.get('commercial_facility_gas_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-main-substation-base.png');
    expect(entries.get('commercial_facility_substation_active')?.src)
      .toBe('/assets/city01/product/facilities/facility-solar-farm-base.png');
  });

  it('keeps runtime asset ids unique after all catalogs are merged', () => {
    const ids = globalAssetCatalog.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
