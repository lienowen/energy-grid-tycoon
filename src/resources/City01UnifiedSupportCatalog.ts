import type { AssetCatalog, AssetEntry } from './AssetManager';

const BASE = '/assets/single/v1';

const supportEntry = (
  id: string,
  src: string,
  width: number,
  height: number,
  anchor: { x: number; y: number },
  tags: readonly string[]
): AssetEntry => ({
  id,
  kind: 'image',
  src,
  version: 1,
  preload: 'level',
  width,
  height,
  anchor,
  tags: ['city-01', 'unified-support-v1', ...tags]
});

export const city01UnifiedSupportCatalog: AssetCatalog = {
  schemaVersion: 1,
  budgetBytes: 5_000_000,
  entries: [
    supportEntry(
      'city01_ground_grass',
      `${BASE}/ground_sheet/ground_sheet__01__grass-lot.png`,
      512,
      256,
      { x: 0.5, y: 0.82 },
      ['ground', 'grass']
    ),
    supportEntry(
      'city01_ground_paved',
      `${BASE}/ground_sheet/ground_sheet__02__paved-lot-a.png`,
      512,
      256,
      { x: 0.5, y: 0.82 },
      ['ground', 'paved']
    ),
    supportEntry(
      'city01_ground_gravel',
      `${BASE}/ground_sheet/ground_sheet__06__gravel-lot-a.png`,
      512,
      256,
      { x: 0.5, y: 0.82 },
      ['ground', 'gravel']
    ),
    supportEntry(
      'city01_ground_rough',
      `${BASE}/ground_sheet/ground_sheet__10__rough-lot-a.png`,
      512,
      256,
      { x: 0.5, y: 0.82 },
      ['ground', 'rough']
    ),
    supportEntry(
      'city01_placement_warning',
      `${BASE}/build_sheet/build_sheet__10__small-bar-e.png`,
      512,
      256,
      { x: 0.5, y: 0.72 },
      ['placement', 'warning']
    ),
    supportEntry(
      'city01_placement_valid',
      `${BASE}/build_sheet/build_sheet__11__small-bar-f.png`,
      512,
      256,
      { x: 0.5, y: 0.72 },
      ['placement', 'valid']
    ),
    supportEntry(
      'city01_placement_footprint',
      `${BASE}/build_sheet/build_sheet__16__menu-icon.png`,
      512,
      256,
      { x: 0.5, y: 0.72 },
      ['placement', 'footprint']
    ),
    supportEntry(
      'city01_placement_invalid',
      `${BASE}/build_sheet/build_sheet__18__small-bar-j.png`,
      512,
      256,
      { x: 0.5, y: 0.72 },
      ['placement', 'invalid']
    ),
    supportEntry(
      'city01_fx_smoke_dark',
      `${BASE}/gas_sheet/gas_sheet__06__smoke-white.png`,
      512,
      512,
      { x: 0.5, y: 0.85 },
      ['effect', 'smoke', 'dark', 'semantic-correction']
    ),
    supportEntry(
      'city01_fx_smoke_light',
      `${BASE}/gas_sheet/gas_sheet__07__smoke-dark.png`,
      512,
      512,
      { x: 0.5, y: 0.85 },
      ['effect', 'smoke', 'light', 'semantic-correction']
    ),
    supportEntry(
      'city01_fx_energize',
      `${BASE}/substation_sheet/substation_sheet__04__energize-fx.png`,
      512,
      512,
      { x: 0.5, y: 0.72 },
      ['effect', 'energize']
    ),
    supportEntry(
      'city01_fx_spark',
      `${BASE}/tower_sheet/tower_sheet__06__spark-fx.png`,
      512,
      512,
      { x: 0.5, y: 0.55 },
      ['effect', 'spark']
    )
  ]
};
