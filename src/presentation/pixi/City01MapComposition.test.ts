import { describe, expect, it } from 'vitest';
import {
  city01BaseMapPlacement,
  city01GroundDetailsPlacement,
  city01MapPlacements,
  city01P0AssetIds,
  city01P0AssetPlacements,
  city01P0RoadPlacements,
  city01P0UrbanPlacements,
  city01RequiredLiveAssetIds,
  city01RoadNetworkPlacement
} from './City01MapComposition';

describe('City01MapComposition', () => {
  it('uses one complete base map as the only live terrain placement', () => {
    const terrain = city01MapPlacements.filter((placement) => placement.layer === 'terrain');

    expect(terrain).toEqual([city01BaseMapPlacement]);
    expect(city01BaseMapPlacement.assetId).toBe('city01_map_base');
    expect(city01BaseMapPlacement.width).toBe(1760);
    expect(city01BaseMapPlacement.anchorY).toBe(0.5);
  });

  it('keeps the authored road surface and adds all four P0 road modules once', () => {
    const roads = city01MapPlacements.filter((placement) => placement.layer === 'roads');

    expect(roads).toEqual([city01RoadNetworkPlacement, ...city01P0RoadPlacements]);
    expect(city01P0RoadPlacements).toHaveLength(4);
    expect(new Set(city01P0RoadPlacements.map((placement) => placement.assetId)).size).toBe(4);
    expect(city01P0RoadPlacements.every((placement) => placement.anchorY === 0.5)).toBe(true);
  });

  it('keeps one aligned ground-detail surface beneath the modular city blocks', () => {
    const decorations = city01MapPlacements.filter((placement) => placement.layer === 'groundDecorations');

    expect(decorations).toContain(city01GroundDetailsPlacement);
    expect(city01GroundDetailsPlacement.assetId).toBe('city01_ground_details_base');
    expect(city01GroundDetailsPlacement.width).toBe(city01BaseMapPlacement.width);
    expect(city01GroundDetailsPlacement.anchorY).toBe(city01BaseMapPlacement.anchorY);
    expect(city01GroundDetailsPlacement.point).toEqual(city01BaseMapPlacement.point);
  });

  it('replaces repeated district filler with six purpose-built P0 city modules', () => {
    expect(city01P0UrbanPlacements).toHaveLength(6);
    expect(city01P0UrbanPlacements.every((placement) => placement.layer === 'groundDecorations')).toBe(true);
    expect(city01P0UrbanPlacements.every((placement) => !placement.assetId.startsWith('commercial_district_'))).toBe(true);
    expect(new Set(city01P0UrbanPlacements.map((placement) => placement.assetId)).size).toBe(6);
  });

  it('uses all ten P0 assets exactly once in the live composition', () => {
    expect(city01P0AssetPlacements).toHaveLength(10);
    expect(city01P0AssetPlacements.map((placement) => placement.assetId)).toEqual(city01P0AssetIds);
    expect(new Set(city01P0AssetPlacements.map((placement) => placement.id)).size)
      .toBe(city01P0AssetPlacements.length);
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

  it('adds visible traffic without turning it into the primary visual layer', () => {
    const vehicles = city01MapPlacements.filter((placement) => placement.layer === 'vehicles');
    expect(vehicles.length).toBeGreaterThanOrEqual(6);
    expect(vehicles.length).toBeLessThanOrEqual(10);
    expect(vehicles.every((placement) => placement.diagnosticsAlpha === 0)).toBe(true);
  });
});
