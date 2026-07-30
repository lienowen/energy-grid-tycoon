import { describe, expect, it } from 'vitest';
import {
  city01BaseMapPlacement,
  city01GroundDetailsPlacement,
  city01MapPlacements,
  city01RequiredLiveAssetIds,
  city01RoadNetworkPlacement,
  city01StaticBackgroundPlacements,
  city01UrbanFabricPlacements,
  city01VehiclePlacements
} from './City01MapComposition';

describe('City01MapComposition', () => {
  it('owns exactly three authored static background surfaces', () => {
    expect(city01StaticBackgroundPlacements).toEqual([
      city01BaseMapPlacement,
      city01RoadNetworkPlacement,
      city01GroundDetailsPlacement
    ]);

    expect(city01BaseMapPlacement.assetId).toBe('city01_map_base');
    expect(city01RoadNetworkPlacement.assetId).toBe('city01_road_network_base');
    expect(city01GroundDetailsPlacement.assetId).toBe('city01_ground_details_base');
    expect(city01StaticBackgroundPlacements.every((placement) => placement.width === 1760)).toBe(true);
    expect(city01StaticBackgroundPlacements.every((placement) => placement.anchorY === 0.5)).toBe(true);
    expect(city01StaticBackgroundPlacements.every((placement) =>
      placement.point.x === city01BaseMapPlacement.point.x
      && placement.point.z === city01BaseMapPlacement.point.z
    )).toBe(true);
  });

  it('does not place auxiliary city blocks from the static composition module', () => {
    expect(city01UrbanFabricPlacements).toEqual([]);
    const liveAssetIds = new Set(city01MapPlacements.map((placement) => placement.assetId));
    const retiredFillIds = [
      'commercial_corner_01',
      'apartment_courtyard_01',
      'office_campus_01',
      'suburban_neighborhood_01',
      'park_pocket_01',
      'industrial_yard_01'
    ];
    for (const assetId of retiredFillIds) expect(liveAssetIds.has(assetId)).toBe(false);
  });

  it('keeps only the authored road asset in the live map composition', () => {
    const roads = city01MapPlacements.filter((placement) => placement.layer === 'roads');
    expect(roads).toEqual([city01RoadNetworkPlacement]);

    const forbiddenRoadAssets = new Set([
      'city01_road_connector_short',
      'road_straight_01',
      'road_corner_01',
      'road_t_junction_01',
      'road_cross_01',
      'terrain_road_bridge_base',
      'terrain_road_corner_base',
      'terrain_road_crossroad_base',
      'terrain_road_straight_base',
      'terrain_road_t_junction_base',
      'terrain_road_dead_end_base'
    ]);
    expect(city01MapPlacements.every((placement) => !forbiddenRoadAssets.has(placement.assetId))).toBe(true);
  });

  it('declares the complete four-asset static runtime contract', () => {
    expect(city01RequiredLiveAssetIds).toEqual([
      'city01_map_base',
      'city01_road_network_base',
      'city01_ground_details_base',
      'city01_ocean_water_base'
    ]);

    const placed = new Set(city01MapPlacements.map((placement) => placement.assetId));
    expect(placed.has('city01_map_base')).toBe(true);
    expect(placed.has('city01_road_network_base')).toBe(true);
    expect(placed.has('city01_ground_details_base')).toBe(true);
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
