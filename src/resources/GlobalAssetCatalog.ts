import legacyCatalogData from './asset-catalog.json';
import v5CatalogData from './asset-catalog-v5.json';
import type { AssetCatalog, AssetEntry } from './AssetManager';

const legacyCatalog = legacyCatalogData as unknown as AssetCatalog;
const v5Catalog = v5CatalogData as unknown as AssetCatalog;

const mergeEntries = (...catalogs: readonly AssetCatalog[]): AssetEntry[] => {
  const entries = new Map<string, AssetEntry>();
  for (const catalog of catalogs) {
    for (const entry of catalog.entries) entries.set(entry.id, { ...entry });
  }
  return [...entries.values()];
};

export const globalAssetCatalog: AssetCatalog = {
  schemaVersion: Math.max(legacyCatalog.schemaVersion, v5Catalog.schemaVersion),
  budgetBytes: (legacyCatalog.budgetBytes ?? 0) + (v5Catalog.budgetBytes ?? 100_000_000),
  entries: mergeEntries(legacyCatalog, v5Catalog)
};
