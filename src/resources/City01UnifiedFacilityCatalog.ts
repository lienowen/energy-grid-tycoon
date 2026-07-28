import type { AssetCatalog, AssetEntry } from './AssetManager';

const BASE = '/assets/single/v1';
const ANCHOR = { x: 0.5, y: 0.9115 } as const;

export const retiredCity01FacilitySourcePrefix = '/assets/city01/product/facilities/';

const entry = (
  id: string,
  src: string,
  tags: readonly string[]
): AssetEntry => ({
  id,
  kind: 'image',
  src,
  version: 3,
  preload: 'level',
  width: 512,
  height: 512,
  anchor: ANCHOR,
  tags: ['city-01', 'facility', 'unified-runtime-v1', ...tags]
});

const family = (
  runtimeName: string,
  folder: string,
  files: Readonly<Record<string, string>>,
  tags: readonly string[] = []
): AssetEntry[] => Object.entries(files).map(([state, file]) => entry(
  `commercial_facility_${runtimeName}_${state}`,
  `${BASE}/${folder}/${file}`,
  [...tags, state]
));

const entries: AssetEntry[] = [
  ...family('solar', 'solar_sheet', {
    active: 'solar_sheet__01__base-main.png',
    construction: 'solar_sheet__02__construction.png',
    offline: 'solar_sheet__03__offline.png',
    fault: 'solar_sheet__04__fault-or-limited.png'
  }, ['solar']),
  ...family('wind', 'wind_sheet', {
    active: 'wind_sheet__01__base-main.png',
    construction: 'wind_sheet__04__construction.png',
    offline: 'wind_sheet__01__base-main.png',
    fault: 'wind_sheet__05__fault-or-limited.png'
  }, ['wind']),
  ...family('gas', 'gas_sheet', {
    active: 'gas_sheet__01__base-main.png',
    construction: 'gas_sheet__02__construction.png',
    offline: 'gas_sheet__03__offline.png',
    fault: 'gas_sheet__04__base-variant.png'
  }, ['gas']),
  ...family('battery', 'battery_sheet', {
    active: 'battery_sheet__01__base-main.png',
    construction: 'battery_sheet__02__construction.png',
    offline: 'battery_sheet__03__offline.png',
    fault: 'battery_sheet__04__fault-or-limited.png'
  }, ['battery', 'small']),
  ...family('battery_utility', 'battery_utility_sheet', {
    active: 'battery_utility_sheet__01__base-main.png',
    construction: 'battery_utility_sheet__02__construction.png',
    offline: 'battery_utility_sheet__03__offline.png',
    fault: 'battery_utility_sheet__05__fault-or-limited.png'
  }, ['battery', 'utility']),
  ...family('substation', 'substation_sheet', {
    active: 'substation_sheet__01__base-main.png',
    construction: 'substation_sheet__03__construction.png',
    offline: 'substation_sheet__02__offline.png',
    fault: 'substation_sheet__05__fault-or-limited.png'
  }, ['substation']),
  entry(
    'world_facility_grid_node_active',
    `${BASE}/tower_sheet/tower_sheet__01__base-main.png`,
    ['grid-node', 'active']
  ),
  entry(
    'world_facility_grid_node_overload',
    `${BASE}/tower_sheet/tower_sheet__02__offline.png`,
    ['grid-node', 'overload']
  ),
  entry(
    'world_facility_grid_node_offline',
    `${BASE}/tower_sheet/tower_sheet__03__fault-or-limited.png`,
    ['grid-node', 'offline']
  )
];

export const city01UnifiedFacilityCatalog: AssetCatalog = {
  schemaVersion: 3,
  budgetBytes: 12_000_000,
  entries
};
