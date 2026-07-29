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

  it('uses one pixel-aligned road network as the only live road placement', () => {
    const roads = city01MapPlacements.filter((placement) => placement.layer === 'roads');

    expect(roads).toEqual([city01RoadNetworkPlacement]);
    expect(city01RoadNetworkPlacement.assetId).toBe('city01_road_network_base');
    expect(city01RoadNetworkPlacement.width).toBe(city01BaseMapPlacement.width);
    expect(city01RoadNetworkPlacement.anchorY).toBe(city01BaseMapPlacement.anchorY);
    expect(city01RoadNetworkPlacement.point).toEqual(city01BaseMapPlacement.point);
  });

  it('keeps one aligned ground-detail surface beneath the urban fabric', () => {
    const decorations = city01MapPlacements.filter((placement) => placement.layer === 'groundDecorations');

    expect(decorations).toContain(city01GroundDetailsPlacement);
    expect(city01GroundDetailsPlacement.assetId).toBe('city01_ground_details_base');
    expect(city01GroundDetailsPlacement.width).toBe(city01BaseMapPlacement.width);
    expect(city01GroundDetailsPlacement.anchorY).toBe(city01BaseMapPlacement.anchorY);
    expect(city01GroundDetailsPlacement.point).toEqual(city01BaseMapPlacement.point);
  });

  it('fills the roads between landmarks with secondary city blocks', () => {
    expect(city01UrbanFabricPlacements.length).toBeGreaterThanOrEqual(18);
    expect(city01UrbanFabricPlacements.every((placement) => placement.layer === 'groundDecorations')).toBe(true);
    expect(city01UrbanFabricPlacements.every((placement) => placement.assetId.startsWith('commercial_district_'))).toBe(true);
    expect(city01UrbanFabricPlacements.every((placement) => (placement.alpha ?? 1) < 0.9)).toBe(true);
    expect(new Set(city01UrbanFabricPlacements.map((placement) => placement.id)).size)
      .toBe(city01UrbanFabricPlacements.length);
  });

  it('does not assemble the island or road network from large external tiles', () => {
    const forbidden = new Set([
      'terrain_beach_open_base',
      'terrain_coast_cliff_base',
      'terrain_harbor_pier_base',
      'terrain_seafront_base',
      'terrain_empty_grasslot_base',
      'terrain_forest_base',
      'terrain_park_plaza_base',
      'terrain_small_park_base',
      'terrain_road_bridge_base',
      'terrain_road_corner_base',
      'terrain_road_crossroad_base',
      'terrain_road_straight_base',
      'terrain_road_t_junction_base',
      'terrain_road_dead_end_base',
      'city01_road_connector_short'
    ]);

    expect(city01MapPlacements.every((placement) => !forbidden.has(placement.assetId))).toBe(true);
  });

  it('uses every required live asset without forcing unused source material', () => {
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

  it('adds visible traffic without turning it into the primary visual layer', () => {
    const vehicles = city01MapPlacements.filter((placement) => placement.layer === 'vehicles');
    expect(vehicles.length).toBeGreaterThanOrEqual(6);
    expect(vehicles.length).toBeLessThanOrEqual(10);
    expect(vehicles.every((placement) => placement.diagnosticsAlpha === 0)).toBe(true);
  });
});
