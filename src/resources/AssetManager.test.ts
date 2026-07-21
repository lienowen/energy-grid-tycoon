import { describe, expect, it } from 'vitest';
import assetCatalogData from './asset-catalog.json';
import { AssetManager, type AssetCatalog } from './AssetManager';

describe('AssetManager', () => {
  it('loads metadata-backed asset catalogs', () => {
    AssetManager.load(assetCatalogData as unknown as AssetCatalog);

    expect(AssetManager.has('building_solar')).toBe(true);
    expect(AssetManager.get('building_solar')).toBe('/assets/buildings/solar_basic.png');
    expect(AssetManager.getEntry('building_solar')).toMatchObject({
      kind: 'image',
      width: 512,
      height: 512,
      preload: 'level'
    });
  });

  it('reports missing and non-browser preload requests without throwing', async () => {
    AssetManager.load(assetCatalogData as unknown as AssetCatalog);
    const report = await AssetManager.preload(['brand_logo', 'missing_asset']);

    expect(report.requested).toEqual(['brand_logo', 'missing_asset']);
    expect(report.failed).toContain('missing_asset');
    expect(report.skipped).toContain('brand_logo');
  });
});
