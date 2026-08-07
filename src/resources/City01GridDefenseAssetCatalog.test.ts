import { describe, expect, it } from 'vitest';
import { city01GridDefenseAssetCatalog } from './City01GridDefenseAssetCatalog';

describe('city01GridDefenseAssetCatalog', () => {
  it('registers the complete extracted grid defense pack with unique ids', () => {
    expect(city01GridDefenseAssetCatalog.entries).toHaveLength(58);
    const ids = city01GridDefenseAssetCatalog.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every entry inside the grid defense asset root with explicit dimensions', () => {
    for (const entry of city01GridDefenseAssetCatalog.entries) {
      expect(entry.src.startsWith('/assets/energy_grid_asset_pack/')).toBe(true);
      expect(entry.width).toBeGreaterThan(0);
      expect(entry.height).toBeGreaterThan(0);
      expect(entry.preload).toBe('lazy');
    }
  });
});
