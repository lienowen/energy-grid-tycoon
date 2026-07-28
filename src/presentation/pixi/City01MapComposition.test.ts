import { describe, expect, it } from 'vitest';
import {
  city01BaseMapPlacement,
  city01MapPlacements,
  city01RequiredLiveAssetIds
} from './City01MapComposition';

describe('City01MapComposition', () => {
  it('uses one complete base map as the only live terrain placement', () => {
    const terrain = city01MapPlacements.filter((placement) => placement.layer === 'terrain');

    expect(terrain).toEqual([city01BaseMapPlacement]);
    expect(city01BaseMapPlacement.assetId).toBe('city01_map_base');
    expect(city01BaseMapPlacement.width).toBe(1760);
    expect(city01BaseMapPlacement.anchorY).toBe(0.5);
  });

  it('does not assemble the island from external coast or environment tiles', () => {
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

  it('uses product road art with only two cropped short-link details', () => {
    const roads = city01MapPlacements.filter((placement) => placement.layer === 'roads');
    expect(roads.length).toBeGreaterThanOrEqual(8);
    expect(roads.every((placement) => placement.assetId.includes('road'))).toBe(true);
    const shortLinks = roads.filter((placement) => placement.assetId === 'city01_road_connector_short');
    expect(shortLinks).toHaveLength(2);
    expect(shortLinks.every((placement) => placement.width <= 180)).toBe(true);
  });

  it('adds product vehicles without turning the map into a traffic layer', () => {
    const vehicles = city01MapPlacements.filter((placement) => placement.layer === 'vehicles');
    expect(vehicles).toHaveLength(3);
    expect(vehicles.every((placement) => placement.diagnosticsAlpha === 0)).toBe(true);
  });
});
