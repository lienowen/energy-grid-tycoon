import legacyCatalogData from './asset-catalog.json';
import v5CatalogData from './asset-catalog-v5.json';
import commercialCatalogData from './asset-catalog-commercial.json';
import city01ProductCatalogData from './asset-catalog-city01-v0.5.json';
import city01RuntimeCatalogData from './asset-catalog-city01-runtime.json';
import city01MapRuntimeCatalogData from './asset-catalog-city01-map-runtime.json';
import runtimeOverrideData from './asset-runtime-overrides.json';
import {
  city01UnifiedFacilityCatalog,
  retiredCity01FacilitySourcePrefix
} from './City01UnifiedFacilityCatalog';
import { city01UnifiedSupportCatalog } from './City01UnifiedSupportCatalog';
import { city01UnifiedGridCatalog } from './City01UnifiedGridCatalog';
import { city01FacilityP0Catalog } from './City01FacilityP0Catalog';
import { city01BattleAssetCatalog } from './City01BattleAssetCatalog';
import type { AssetCatalog, AssetEntry } from './AssetManager';

const legacyCatalog = legacyCatalogData as unknown as AssetCatalog;
const v5Catalog = v5CatalogData as unknown as AssetCatalog;
const commercialCatalog = commercialCatalogData as unknown as AssetCatalog;
const city01ProductCatalog = city01ProductCatalogData as unknown as AssetCatalog;
const city01RuntimeCatalog = city01RuntimeCatalogData as unknown as AssetCatalog;
const city01MapRuntimeCatalog = city01MapRuntimeCatalogData as unknown as AssetCatalog;

type RuntimeOverride = {
  id: string;
  src: string;
  version: number;
  width: number;
  height: number;
  tag?: string;
};

const runtimeOverrides = new Map(
  (runtimeOverrideData.entries as RuntimeOverride[]).map((entry) => [`${entry.id}::${entry.src}`, entry])
);

const isRetiredRuntimeEntry = (entry: AssetEntry): boolean =>
  entry.src.startsWith(retiredCity01FacilitySourcePrefix);

const normalizeEntry = (entry: AssetEntry): AssetEntry => {
  const override = runtimeOverrides.get(`${entry.id}::${entry.src}`);
  if (!override) return { ...entry };
  return {
    ...entry,
    version: Math.max(entry.version, override.version),
    width: override.width,
    height: override.height,
    tags: override.tag && !entry.tags?.includes(override.tag)
      ? [...(entry.tags ?? []), override.tag]
      : entry.tags
  };
};

const mergeEntries = (...catalogs: readonly AssetCatalog[]): AssetEntry[] => {
  const entries = new Map<string, AssetEntry>();
  for (const catalog of catalogs) {
    for (const entry of catalog.entries) {
      if (isRetiredRuntimeEntry(entry)) continue;
      entries.set(entry.id, normalizeEntry(entry));
    }
  }
  return [...entries.values()];
};

export const globalAssetCatalog: AssetCatalog = {
  schemaVersion: Math.max(
    legacyCatalog.schemaVersion,
    v5Catalog.schemaVersion,
    commercialCatalog.schemaVersion,
    city01ProductCatalog.schemaVersion,
    city01RuntimeCatalog.schemaVersion,
    city01MapRuntimeCatalog.schemaVersion,
    city01UnifiedFacilityCatalog.schemaVersion,
    city01UnifiedSupportCatalog.schemaVersion,
    city01UnifiedGridCatalog.schemaVersion,
    city01FacilityP0Catalog.schemaVersion,
    city01BattleAssetCatalog.schemaVersion
  ),
  budgetBytes: (legacyCatalog.budgetBytes ?? 0)
    + (v5Catalog.budgetBytes ?? 100_000_000)
    + (commercialCatalog.budgetBytes ?? 40_000_000)
    + (city01ProductCatalog.budgetBytes ?? 80_000_000)
    + (city01RuntimeCatalog.budgetBytes ?? 50_000_000)
    + (city01MapRuntimeCatalog.budgetBytes ?? 4_000_000)
    + (city01UnifiedFacilityCatalog.budgetBytes ?? 12_000_000)
    + (city01UnifiedSupportCatalog.budgetBytes ?? 5_000_000)
    + (city01UnifiedGridCatalog.budgetBytes ?? 3_000_000)
    + (city01FacilityP0Catalog.budgetBytes ?? 14_000_000)
    + (city01BattleAssetCatalog.budgetBytes ?? 30_000_000),
  entries: mergeEntries(
    legacyCatalog,
    v5Catalog,
    commercialCatalog,
    city01ProductCatalog,
    city01RuntimeCatalog,
    city01MapRuntimeCatalog,
    city01UnifiedFacilityCatalog,
    city01UnifiedSupportCatalog,
    city01UnifiedGridCatalog,
    city01FacilityP0Catalog,
    city01BattleAssetCatalog
  )
};
