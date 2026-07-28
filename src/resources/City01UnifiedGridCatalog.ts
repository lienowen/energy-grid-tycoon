import type { AssetCatalog, AssetEntry } from './AssetManager';

const BASE = '/assets/single/v1/grid_sheet';

const gridEntry = (
  id: string,
  file: string,
  tags: readonly string[]
): AssetEntry => ({
  id,
  kind: 'image',
  src: `${BASE}/${file}`,
  version: 1,
  preload: 'level',
  width: 512,
  height: 128,
  anchor: { x: 0.5, y: 0.5 },
  tags: ['city-01', 'grid-line-runtime-v1', ...tags]
});

export const city01UnifiedGridCatalog: AssetCatalog = {
  schemaVersion: 1,
  budgetBytes: 3_000_000,
  entries: [
    gridEntry(
      'city01_grid_line_normal',
      'grid_sheet__01__line-normal-with-towers.png',
      ['line', 'normal', 'runtime-crop']
    ),
    gridEntry(
      'city01_grid_line_overload',
      'grid_sheet__02__line-overload-with-towers.png',
      ['line', 'overload', 'runtime-crop']
    ),
    gridEntry(
      'city01_grid_line_offline',
      'grid_sheet__03__line-offline-with-towers.png',
      ['line', 'offline', 'runtime-crop']
    ),
    gridEntry(
      'city01_grid_line_highload',
      'grid_sheet__04__line-highload.png',
      ['line', 'highload']
    ),
    gridEntry(
      'city01_grid_line_restore',
      'grid_sheet__06__line-restore.png',
      ['line', 'restore']
    ),
    gridEntry(
      'city01_grid_line_flow',
      'grid_sheet__08__line-flow.png',
      ['line', 'flow']
    ),
    gridEntry(
      'city01_grid_line_arc',
      'grid_sheet__09__warning-panel.png',
      ['line', 'arc', 'semantic-correction']
    )
  ]
};
