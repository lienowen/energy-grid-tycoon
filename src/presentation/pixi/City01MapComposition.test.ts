import { describe, expect, it } from 'vitest';
import {
  city01IslandBoundary,
  city01MapPlacements,
  city01RequiredLiveAssetIds
} from './City01MapComposition';

describe('City01MapComposition', () => {
  it('uses every topology-compatible live asset without forcing incompatible tiles', () => {
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
    }
  });

  it('keeps the tightened island and connected coast inside the City-01 camera bounds', () => {
    expect(city01IslandBoundary.length).toBeGreaterThanOrEqual(8);
    for (const point of city01IslandBoundary) {
      expect(Math.abs(point.x)).toBeLessThanOrEqual(50);
      expect(Math.abs(point.z)).toBeLessThanOrEqual(32);
    }
    for (const placement of city01MapPlacements) {
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
