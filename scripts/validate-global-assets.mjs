import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];

const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), 'utf8')
);

const pngDimensions = (buffer) => {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const legacyCatalog = await readJson('src/resources/asset-catalog.json');
const v5Catalog = await readJson('src/resources/asset-catalog-v5.json');

if (!Number.isInteger(v5Catalog.schemaVersion) || v5Catalog.schemaVersion < 5) {
  errors.push('V5 asset catalog schemaVersion must be at least 5.');
}
if (!Array.isArray(v5Catalog.entries) || v5Catalog.entries.length === 0) {
  errors.push('V5 asset catalog must contain entries.');
}

const merged = new Map();
for (const catalog of [legacyCatalog, v5Catalog]) {
  for (const entry of catalog.entries ?? []) merged.set(entry.id, entry);
}

const ids = new Set();
const sources = new Set();
let totalAssetBytes = 0;
for (const entry of merged.values()) {
  if (!entry.id || typeof entry.id !== 'string') {
    errors.push('Merged asset entry is missing a string id.');
    continue;
  }
  if (ids.has(entry.id)) errors.push(`Duplicate merged asset id: ${entry.id}`);
  ids.add(entry.id);

  if (typeof entry.src !== 'string' || !entry.src.startsWith('/assets/')) {
    errors.push(`Asset ${entry.id} must use an /assets/ source path.`);
    continue;
  }
  sources.add(entry.src);

  const absolutePath = path.join(root, 'public', entry.src.replace(/^\/+/, ''));
  let fileInfo;
  try {
    fileInfo = await stat(absolutePath);
  } catch {
    errors.push(`Asset file does not exist: ${entry.id} -> ${entry.src}`);
    continue;
  }
  if (!fileInfo.isFile() || fileInfo.size <= 0) {
    errors.push(`Asset file is empty or invalid: ${entry.id} -> ${entry.src}`);
    continue;
  }
  totalAssetBytes += fileInfo.size;

  if (entry.src.endsWith('.png')) {
    const bytes = await readFile(absolutePath);
    const dimensions = pngDimensions(bytes);
    if (!dimensions) {
      errors.push(`Asset is not a valid PNG: ${entry.id}`);
    } else if (
      Number.isFinite(entry.width)
      && Number.isFinite(entry.height)
      && (entry.width !== dimensions.width || entry.height !== dimensions.height)
    ) {
      errors.push(
        `Asset dimensions do not match catalog: ${entry.id} `
        + `(catalog ${entry.width}x${entry.height}, file ${dimensions.width}x${dimensions.height})`
      );
    }
  }
}

const buildingIds = [
  'res_tower_a','res_tower_b','res_slab_a','res_slab_b','res_townhouse','res_oldblock',
  'com_mall','com_office','com_landmark','com_strip',
  'ind_factory','ind_warehouse','ind_tankfarm','ind_heavy',
  'civic_hospital','civic_school','civic_cityhall','civic_transit'
];
const facilityIds = [
  'solar','wind','gas','battery','substation','charging_hub','nuclear','hydro','offshore_wind','grid_node'
];
const vehicleIds = [
  'car_cyan','car_green','car_red','taxi','bus','truck','fire','ambulance','police','service'
];
const requiredIds = new Set([
  'world_effect_blackout_zone',
  'world_effect_demand_high',
  'world_effect_citizen_happy',
  'world_effect_citizen_unhappy',
  'world_effect_power_shortage',
  'world_effect_construction',
  'world_decoration_tree_oak',
  'world_decoration_tree_pine',
  'world_decoration_tree_round',
  'world_decoration_tree_maple',
  'world_decoration_tree_planter',
  'world_decoration_bench',
  'world_decoration_fountain',
  'world_road_straight_2_ne',
  'world_road_straight_2_nw',
  'world_road_straight_4_ne',
  'world_road_straight_4_nw'
]);

for (const building of buildingIds) {
  for (const state of ['day','night','blackout']) {
    requiredIds.add(`world_building_${building}_${state}`);
  }
  requiredIds.add(`world_building_${building}_shadow`);
}
for (const facility of facilityIds) {
  for (const state of ['idle','active','overload','offline','construction','upgrade','selected','damaged']) {
    requiredIds.add(`world_facility_${facility}_${state}`);
  }
  requiredIds.add(`world_facility_${facility}_shadow`);
  for (const component of ['light','motion','effect']) {
    requiredIds.add(`world_facility_${facility}_component_${component}`);
  }
}
for (const vehicle of vehicleIds) {
  for (const direction of ['ne','nw','se','sw']) {
    requiredIds.add(`world_vehicle_${vehicle}_${direction}`);
  }
}

for (const id of requiredIds) {
  if (!ids.has(id)) errors.push(`Runtime visual registry references missing asset id: ${id}`);
}

const budgetBytes = (legacyCatalog.budgetBytes ?? 20_000_000) + (v5Catalog.budgetBytes ?? 100_000_000);
if (totalAssetBytes > budgetBytes) {
  errors.push(`Merged asset budget exceeded: ${totalAssetBytes} bytes used, ${budgetBytes} bytes allowed.`);
}

console.log(`Global asset check: ${merged.size} merged entries, ${v5Catalog.entries?.length ?? 0} V5 entries.`);
console.log(`Merged asset payload: ${totalAssetBytes} / ${budgetBytes} bytes.`);
console.log(`Unique source files: ${sources.size}.`);

if (errors.length > 0) {
  console.error(`Global asset errors (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('V5 global asset registry validation passed.');
}