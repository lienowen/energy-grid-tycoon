import { describe, expect, it } from 'vitest';
import {
  city01DecorDetailsPlacement,
  city01LandPlacement,
  city01MapPlacements,
  city01RequiredLiveAssetIds,
  city01RoadThinPlacement,
  city01StaticBackgroundPlacements,
  city01UrbanFabricPlacements,
  city01VehiclePlacements,
  city01ZoneMaskPlacement
} from './City01MapComposition';

describe('City01MapComposition', () => {
  it('owns exactly four aligned split gameplay layers', () => {
    expect(city01StaticBackgroundPlacements).toEqual([
      city01LandPlacement,
      city01ZoneMaskPlacement,
      city01RoadThinPlacement,
      city01DecorDetailsPlacement
    ]);

    expect(city01LandPlacement.assetId).toBe('city01_land_base');
    expect(city01ZoneMaskPlacement.assetId).toBe('city01_zone_mask');
    expect(city01RoadThinPlacement.assetId).toBe('city01_road_thin');
    expect(city01DecorDetailsPlacement.assetId).toBe('city01_decor_details');
    expect(city01StaticBackgroundPlacements.every((placement) => placement.width === 1760)).toBe(true);
    expect(city01StaticBackgroundPlacements.every((placement) => placement.anchorY === 0.5)).toBe(true);
    expect(city01StaticBackgroundPlacements.every((placement) =>
      placement.point.x === city01LandPlacement.point.x
      && placement.point.z === city01LandPlacement.point.z
    )).toBe(true);
  });

  it('assigns each split layer a single visual responsibility', () => {
    expect(city01LandPlacement.layer).toBe('terrain');
    expect(city01RoadThinPlacement.layer).toBe('roads');
    expect(city01ZoneMaskPlacement.layer).toBe('groundDecorations');
    expect(city01DecorDetailsPlacement.layer).toBe('groundDecorations');
    expect(city01ZoneMaskPlacement.diagnosticsAlpha).toBeLessThan(0.4);
    expect(city01DecorDetailsPlacement.diagnosticsAlpha).toBeLessThan(0.3);
  });

  it('does not place auxiliary city blocks or modular road tiles', () => {
    expect(city01UrbanFabricPlacements).toEqual([]);
    const liveAssetIds = new Set(city01MapPlacements.map((placement) => placement.assetId));
    const forbidden = [
      'city01_map_base',
      'city01_road_network_base',
      'city01_ground_details_base',
      'city01_road_connector_short',
      'commercial_corner_01',
      'apartment_courtyard_01',
      'office_campus_01',
      'suburban_neighborhood_01',
      'park_pocket_01',
      'industrial_yard_01',
      'road_straight_01',
      'road_corner_01',
      'road_t_junction_01',
      'road_cross_01'
    ];
    for (const assetId of forbidden) expect(liveAssetIds.has(assetId)).toBe(false);
  });

  it('declares the complete five-asset runtime contract', () => {
    expect(city01RequiredLiveAssetIds).toEqual([
      'city01_land_base',
      'city01_zone_mask',
      'city01_road_thin',
      'city01_decor_details',
      'city01_ocean_water_base'
    ]);

    const placed = new Set(city01MapPlacements.map((placement) => placement.assetId));
    expect(placed.has('city01_land_base')).toBe(true);
    expect(placed.has('city01_zone_mask')).toBe(true);
    expect(placed.has('city01_road_thin')).toBe(true);
    expect(placed.has('city01_decor_details')).toBe(true);
    expect(placed.has('city01_ocean_water_base')).toBe(false);
  });

  it('keeps placement identifiers unique and dimensions valid', () => {
    const ids = city01MapPlacements.map((placement) => placement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const placement of city01MapPlacements) {
      expect(placement.width).toBeGreaterThan(0);
      expect(placement.anchorY).toBeGreaterThanOrEqual(0);
      expect(placement.anchorY).toBeLessThanOrEqual(1);
      expect(Math.abs(placement.point.x)).toBeLessThanOrEqual(55);
      expect(Math.abs(placement.point.z)).toBeLessThanOrEqual(40);
    }
  });

  it('keeps traffic sparse and outside the dominant visual scale', () => {
    const vehicles = city01MapPlacements.filter((placement) => placement.layer === 'vehicles');
    expect(vehicles).toEqual(city01VehiclePlacements);
    expect(vehicles.length).toBeGreaterThanOrEqual(4);
    expect(vehicles.length).toBeLessThanOrEqual(6);
    expect(vehicles.every((placement) => placement.width <= 40)).toBe(true);
    expect(vehicles.every((placement) => placement.diagnosticsAlpha === 0)).toBe(true);
  });
});
