import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];
const warnings = [];

const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), 'utf8')
);

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else files.push(absolute);
  }
  return files;
};

const pngDimensions = (buffer) => {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const assetCatalog = await readJson('src/resources/asset-catalog.json');
const buildings = await readJson('src/data/buildings.json');
const events = await readJson('src/data/events.json');
const levels = await readJson('src/data/levels.json');
const policies = await readJson('src/data/policies.json');
const technologies = await readJson('src/data/technologies.json');

if (assetCatalog.schemaVersion !== 1) errors.push('Asset catalog schemaVersion must be 1.');
if (!Number.isFinite(assetCatalog.budgetBytes) || assetCatalog.budgetBytes <= 0) {
  errors.push('Asset catalog budgetBytes must be a positive number.');
}
if (!Array.isArray(assetCatalog.entries) || assetCatalog.entries.length === 0) {
  errors.push('Asset catalog must contain entries.');
}

const ids = new Set();
const sources = new Map();
const hashes = new Map();
let totalAssetBytes = 0;

for (const entry of assetCatalog.entries ?? []) {
  if (!entry.id || typeof entry.id !== 'string') {
    errors.push('Asset entry is missing a string id.');
    continue;
  }
  if (ids.has(entry.id)) errors.push(`Duplicate asset id: ${entry.id}`);
  ids.add(entry.id);

  if (typeof entry.src !== 'string' || !entry.src.startsWith('/assets/')) {
    errors.push(`Asset ${entry.id} must use an /assets/ source path.`);
    continue;
  }
  if (sources.has(entry.src)) {
    errors.push(`Asset source is registered more than once: ${entry.src}`);
  }
  sources.set(entry.src, entry.id);

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

  const bytes = await readFile(absolutePath);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const duplicateOf = hashes.get(hash);
  if (duplicateOf) errors.push(`Duplicate asset bytes: ${entry.id} duplicates ${duplicateOf}`);
  else hashes.set(hash, entry.id);

  if (entry.src.endsWith('.png')) {
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

if (totalAssetBytes > assetCatalog.budgetBytes) {
  errors.push(
    `Asset budget exceeded: ${totalAssetBytes} bytes used, ${assetCatalog.budgetBytes} bytes allowed.`
  );
}

const referencedAssetIds = new Set([
  'brand_logo',
  'status_stable',
  'status_warning',
  'ui_grid_pattern'
]);
for (const building of buildings) referencedAssetIds.add(building.assetId);
for (const technology of technologies) referencedAssetIds.add(technology.assetId);
for (const policy of policies) referencedAssetIds.add(policy.assetId);
for (const event of events) referencedAssetIds.add(`event_${event.id}`);
for (const level of levels) {
  if (level.presentation?.backgroundAssetId) referencedAssetIds.add(level.presentation.backgroundAssetId);
}

for (const assetId of referencedAssetIds) {
  if (!ids.has(assetId)) errors.push(`Configuration references missing asset id: ${assetId}`);
}
for (const assetId of ids) {
  if (!referencedAssetIds.has(assetId)) warnings.push(`Asset is currently unreferenced: ${assetId}`);
}

const buildingById = new Map(buildings.map((building) => [building.id, building]));
const validZones = new Set(['neighborhood', 'industrial', 'coastal', 'outskirts', 'utility']);
const validCategories = new Set(['generation', 'storage', 'grid']);
for (const building of buildings) {
  for (const zone of building.placementZones ?? []) {
    if (!validZones.has(zone)) errors.push(`Building ${building.id} uses unknown city zone: ${zone}`);
  }
}

for (const level of levels) {
  const prefix = `Level ${level.id}`;
  const plots = level.presentation?.world?.plots;
  if (!Array.isArray(plots) || plots.length === 0) {
    errors.push(`${prefix} must define playable world plots.`);
    continue;
  }

  const plotIds = new Set();
  for (const plot of plots) {
    if (!plot.id || typeof plot.id !== 'string') errors.push(`${prefix} contains a plot without an id.`);
    if (plotIds.has(plot.id)) errors.push(`${prefix} contains duplicate plot id: ${plot.id}`);
    plotIds.add(plot.id);
    if (!validZones.has(plot.zone)) errors.push(`${prefix} plot ${plot.id} has unknown zone: ${plot.zone}`);
    if (!Array.isArray(plot.accepts) || plot.accepts.length === 0) {
      errors.push(`${prefix} plot ${plot.id} accepts no facility category.`);
    } else {
      for (const category of plot.accepts) {
        if (!validCategories.has(category)) errors.push(`${prefix} plot ${plot.id} accepts unknown category: ${category}`);
      }
    }
    if (!Number.isFinite(plot.x) || plot.x < 0 || plot.x > 100) errors.push(`${prefix} plot ${plot.id} has invalid x.`);
    if (!Number.isFinite(plot.y) || plot.y < 0 || plot.y > 100) errors.push(`${prefix} plot ${plot.id} has invalid y.`);
  }

  if (plots.length <= level.initial.buildings.length) {
    errors.push(`${prefix} has no empty land for player expansion.`);
  }

  const startingCounts = new Map();
  for (const buildingId of level.initial.buildings) {
    startingCounts.set(buildingId, (startingCounts.get(buildingId) ?? 0) + 1);
  }
  const placedCounts = new Map();
  const occupied = new Set();
  for (const placement of level.initial.placements ?? []) {
    if (!plotIds.has(placement.plotId)) errors.push(`${prefix} places a facility on unknown plot: ${placement.plotId}`);
    if (occupied.has(placement.plotId)) errors.push(`${prefix} places multiple facilities on plot: ${placement.plotId}`);
    occupied.add(placement.plotId);

    const placed = (placedCounts.get(placement.buildingId) ?? 0) + 1;
    placedCounts.set(placement.buildingId, placed);
    if (placed > (startingCounts.get(placement.buildingId) ?? 0)) {
      errors.push(`${prefix} places more ${placement.buildingId} facilities than it starts with.`);
    }

    const building = buildingById.get(placement.buildingId);
    const plot = plots.find((item) => item.id === placement.plotId);
    if (!building || !plot) continue;
    if (!plot.accepts.includes(building.category)) {
      errors.push(`${prefix} plot ${plot.id} rejects facility category ${building.category}.`);
    }
    if (building.placementZones?.length && !building.placementZones.includes(plot.zone)) {
      errors.push(`${prefix} places ${building.id} in unsupported zone ${plot.zone}.`);
    }
  }
}

const sourceRoot = path.join(root, 'src');
for (const absolutePath of await listFiles(sourceRoot)) {
  const relativePath = path.relative(sourceRoot, absolutePath).replaceAll(path.sep, '/');
  if (relativePath.startsWith('resources/')) continue;
  if (!/\.(ts|css|html)$/.test(relativePath)) continue;
  const content = await readFile(absolutePath, 'utf8');
  if (content.includes('/assets/')) {
    errors.push(`Direct asset path found outside resource layer: src/${relativePath}`);
  }
}

console.log(`Content check: ${levels.length} levels, ${assetCatalog.entries?.length ?? 0} assets.`);
console.log(`Asset payload: ${totalAssetBytes} / ${assetCatalog.budgetBytes} bytes.`);
if (warnings.length > 0) {
  console.warn(`Warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length > 0) {
  console.error(`Errors (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Content, city map, and asset validation passed.');
}
