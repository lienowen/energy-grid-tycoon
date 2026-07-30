import { describe, expect, it } from 'vitest';
import {
  city01BaseMapPlacement,
  city01GroundDetailsPlacement,
  city01MapPlacements,
  city01RequiredLiveAssetIds,
  city01RoadNetworkPlacement,
  city01UrbanFabricPlacements
} from './City01MapComposition';

describe('City01MapComposition', () => {
  it('uses one complete base map as the only live terrain placement', () => {
    const terrain = city01MapPlacements.filter((placement) => placement.layer === 'terrain');

    expect(terrain).toEqual([city01BaseMapPlacement]);
    expect(city01BaseMapPlacement.assetId).toBe('city01_map_base');
    expect(city01BaseMapPlacement.width).toBe(1760);
    expect(city01BaseMapPlacement.anchorY).toBe(0.5);
  });

  it('uses the authored road network as the only live road surface', () => {
    const roads = city01MapPlacements.filter((placement) => placement.layer === 'roads');

    expect(roads).toEqual([city01RoadNetworkPlacement]);
    expect(city01RoadNetworkPlacement.assetId).toBe('city01_road_network_base');
    expect(city01RoadNetworkPlacement.width).toBe(city01BaseMapPlacement.width);
    expect(city01RoadNetworkPlacement.anchorY).toBe(city01BaseMapPlacement.anchorY);
    expect(city01RoadNetworkPlacement.point).toEqual(city01BaseMapPlacement.point);
  });

  it('keeps only the aligned ground-detail surface in the live decoration layer', () => {
    const decorations = city01MapPlacements.filter((placement) => placement.layer === 'groundDecorations');

    expect(decorations).toEqual([city01GroundDetailsPlacement]);
    expect(city01GroundDetailsPlacement.assetId).toBe('city01_ground_details_base');
    expect(city01GroundDetailsPlacement.width).toBe(city01BaseMapPlacement.width);
    expect(city01GroundDetailsPlacement.anchorY).toBe(city01BaseMapPlacement.anchorY);
    expect(city01GroundDetailsPlacement.point).toEqual(city01BaseMapPlacement.point);
  });

  it('keeps reviewed urban fill as inventory but removes it from the live composition', () => {
    expect(city01UrbanFabricPlacements.length).toBeGreaterThanOrEqual(5);
    expect(city01UrbanFabricPlacements.length).toBeLessThanOrEqual(8);
    expect(city01UrbanFabricPlacements.every((placement) => placement.layer === 'groundDecorations')).toBe(true);
    expect(city01UrbanFabricPlacements.every((placement) => (placement.alpha ?? 1) >= 0.28)).toBe(true);
    expect(city01UrbanFabricPlacements.every((placement) => (placement.alpha ?? 1) <= 0.42)).toBe(true);
    const liveIds = new Set(city01MapPlacements.map((placement) => placement.id));
    expect(city01UrbanFabricPlacements.every((placement) => !liveIds.has(placement.id))).toBe(true);
  });

  it('does not layer decorative road tiles over the authored road surface', () => {
    const forbiddenRoadAssets = new Set([
      'road_straight_01',
      'road_corner_01',
      'road_t_junction_01',
      'road_cross_01',
      'terrain_road_bridge_base',
      'terrain_road_corner_base',
      'terrain_road_crossroad_base',
      'terrain_road_straight_base',
      'terrain_road_t_junction_base',
      'terrain_road_dead_end_base',
      'city01_road_connector_short'
    ]);

    expect(city01MapPlacements.every((placement) => !forbiddenRoadAssets.has(placement.assetId))).toBe(true);
  });

  it('does not assemble the island from large external terrain tiles', () => {
    const forbidden = new Set([
      'terrain_beach_open_base',
      'terrain_coast_cliff_base',
      'terrain_harbor_pier_base',
      'terrain_seafront_base',
      'terrain_empty_grasslot_base',
      'terrain_forest_base',
      'terrain_park_plaza_base',
      'terrain_small_park_base'
    ]);

    expect(city01MapPlacements.every((placement) => !forbidden.has(placement.assetId))).toBe(true);
  });

  it('uses every required live asset', () => {
    const usedAssets = new Set(city01MapPlacements.map((placement) => placement.assetId));
    for (const assetId of city01RequiredLiveAssetIds) expect(usedAssets.has(assetId)).toBe(true);
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
    expect(vehicles.length).toBeGreaterThanOrEqual(4);
    expect(vehicles.length).toBeLessThanOrEqual(6);
    expect(vehicles.every((placement) => placement.width <= 40)).toBe(true);
    expect(vehicles.every((placement) => placement.diagnosticsAlpha === 0)).toBe(true);
  });
});
