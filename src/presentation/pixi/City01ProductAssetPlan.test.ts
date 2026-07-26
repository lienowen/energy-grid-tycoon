import { describe, expect, it } from 'vitest';
import productCatalogData from '../../resources/asset-catalog-city01-v0.5.json';
import type { AssetCatalog } from '../../resources/AssetManager';
import {
  allCity01ProductAssetIds,
  city01CrewMarkers,
  city01CrewPortraitAssetIds,
  city01EnvironmentPlacements,
  city01FacilityAssetIds,
  city01VehicleDefinitions
} from './City01ProductAssetPlan';

const productCatalog = productCatalogData as unknown as AssetCatalog;

const sortedUnique = (values: readonly string[]): string[] => [...new Set(values)].sort();

describe('City01ProductAssetPlan', () => {
  it('assigns every committed v0.5 asset to an actual runtime surface', () => {
    const catalogIds = sortedUnique(productCatalog.entries.map((entry) => entry.id));
    const usedIds = sortedUnique(allCity01ProductAssetIds);

    expect(usedIds).toEqual(catalogIds);
    expect(usedIds).toHaveLength(47);
  });

  it('uses all submitted environment, crew and vehicle variants', () => {
    expect(city01EnvironmentPlacements.map((item) => item.assetId)).toHaveLength(16);
    expect(new Set(city01EnvironmentPlacements.map((item) => item.assetId)).size).toBe(16);
    expect(city01FacilityAssetIds).toHaveLength(6);
    expect(city01CrewMarkers).toHaveLength(5);
    expect(city01CrewPortraitAssetIds).toHaveLength(5);
    expect(city01VehicleDefinitions).toHaveLength(5);
    expect(city01VehicleDefinitions.flatMap((vehicle) => [vehicle.baseAssetId, vehicle.mirroredAssetId]))
      .toHaveLength(10);
  });
});
