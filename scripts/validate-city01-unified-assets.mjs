import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = join(repoRoot, 'src/resources/city01-unified-runtime-asset-policy.json');
const facilityCatalogPath = join(repoRoot, 'src/resources/City01UnifiedFacilityCatalog.ts');
const supportCatalogPath = join(repoRoot, 'src/resources/City01UnifiedSupportCatalog.ts');
const gridCatalogPath = join(repoRoot, 'src/resources/City01UnifiedGridCatalog.ts');
const globalCatalogPath = join(repoRoot, 'src/resources/GlobalAssetCatalog.ts');
const retiredCatalogPath = join(repoRoot, 'src/resources/asset-catalog-city01-facility-runtime.json');
const retiredFacilityDirectory = join(repoRoot, 'public/assets/city01/product/facilities');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const facilityCatalogSource = readFileSync(facilityCatalogPath, 'utf8');
const supportCatalogSource = readFileSync(supportCatalogPath, 'utf8');
const gridCatalogSource = readFileSync(gridCatalogPath, 'utf8');
const globalCatalogSource = readFileSync(globalCatalogPath, 'utf8');
const errors = [];

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

assert(policy.schemaVersion === 1, 'City-01 unified asset policy schemaVersion must be 1');
assert(policy.facilityContract?.runtimeCanvas?.width === 512, 'facility runtime width must be 512');
assert(policy.facilityContract?.runtimeCanvas?.height === 512, 'facility runtime height must be 512');
assert(policy.facilityContract?.anchor?.x === 0.5, 'facility anchor.x must be 0.5');
assert(policy.facilityContract?.anchor?.y === 0.9115, 'facility anchor.y must be 0.9115');
assert(Array.isArray(policy.approvedFamilies) && policy.approvedFamilies.length >= 7,
  'at least seven City-01 facility families must be approved');

for (const family of policy.approvedFamilies ?? []) {
  assert(typeof family.id === 'string' && family.id.length > 0, 'approved family id is required');
  assert(Array.isArray(family.states) && family.states.length >= 3,
    `${family.id}: at least three source states are required`);
  assert(facilityCatalogSource.includes(family.folder),
    `${family.id}: unified facility catalog does not reference folder ${family.folder}`);

  const folder = family.folder;
  for (const rawState of family.states ?? []) {
    const state = String(rawState).split(':')[0];
    const file = join(repoRoot, 'public/assets/single/v1', folder, `${folder}__${state}.png`);
    assert(existsSync(file), `${family.id}: approved cut is missing: ${file.replace(`${repoRoot}/`, '')}`);
  }
}

const batches = new Map((policy.cutBatches ?? []).map((batch) => [batch.id, batch]));
for (const batchId of ['P0-ASSET-02', 'P0-ASSET-03', 'P0-ASSET-04']) {
  const batch = batches.get(batchId);
  assert(batch?.status === 'ACTIVE', `${batchId}: cut batch must be ACTIVE`);
  assert(Array.isArray(batch?.runtimeIds) && batch.runtimeIds.length === 4,
    `${batchId}: exactly four runtime asset ids are required`);
  assert(Array.isArray(batch?.approvedSources) && batch.approvedSources.length === 4,
    `${batchId}: exactly four approved source cuts are required`);

  for (const runtimeId of batch?.runtimeIds ?? []) {
    assert(supportCatalogSource.includes(`'${runtimeId}'`),
      `${batchId}: support catalog is missing runtime id ${runtimeId}`);
  }
  for (const sourceStem of batch?.approvedSources ?? []) {
    const folder = String(sourceStem).split('__')[0];
    const file = join(repoRoot, 'public/assets/single/v1', folder, `${sourceStem}.png`);
    assert(existsSync(file), `${batchId}: approved cut is missing: ${file.replace(`${repoRoot}/`, '')}`);
    assert(supportCatalogSource.includes(sourceStem),
      `${batchId}: support catalog does not reference ${sourceStem}`);
  }
}

const gridBatch = batches.get('P0-ASSET-05');
assert(gridBatch?.status === 'ACTIVE', 'P0-ASSET-05: grid line cut batch must be ACTIVE');
assert(Array.isArray(gridBatch?.runtimeIds) && gridBatch.runtimeIds.length === 7,
  'P0-ASSET-05: exactly seven modular grid runtime ids are required');
assert(Array.isArray(gridBatch?.approvedSources) && gridBatch.approvedSources.length === 7,
  'P0-ASSET-05: exactly seven grid source cuts are required');
for (const runtimeId of gridBatch?.runtimeIds ?? []) {
  assert(gridCatalogSource.includes(`'${runtimeId}'`),
    `P0-ASSET-05: grid catalog is missing runtime id ${runtimeId}`);
}
for (const sourceStem of gridBatch?.approvedSources ?? []) {
  const file = join(repoRoot, 'public/assets/single/v1/grid_sheet', `${sourceStem}.png`);
  assert(existsSync(file), `P0-ASSET-05: grid source is missing: ${file.replace(`${repoRoot}/`, '')}`);
  assert(gridCatalogSource.includes(sourceStem),
    `P0-ASSET-05: grid catalog does not reference ${sourceStem}`);
}

const retiredRuntimeEntryPattern = /src\s*:\s*[`'\"]\/assets\/city01\/product\/facilities\//;
assert(!retiredRuntimeEntryPattern.test(facilityCatalogSource),
  'unified facility catalog contains a runtime entry from the retired mislabeled directory');
assert(globalCatalogSource.includes('retiredCity01FacilitySourcePrefix'),
  'global catalog must filter the retired City-01 facility source prefix');
assert(globalCatalogSource.includes('city01UnifiedFacilityCatalog'),
  'global catalog must merge the unified City-01 facility catalog');
assert(globalCatalogSource.includes('city01UnifiedSupportCatalog'),
  'global catalog must merge the unified City-01 support catalog');
assert(globalCatalogSource.includes('city01UnifiedGridCatalog'),
  'global catalog must merge the unified City-01 grid catalog');
assert(!globalCatalogSource.includes('asset-catalog-city01-facility-runtime.json'),
  'global catalog still imports the retired facility runtime JSON');
assert(!existsSync(retiredCatalogPath),
  'retired asset-catalog-city01-facility-runtime.json must be deleted');
assert(!existsSync(retiredFacilityDirectory),
  'retired mislabeled facility image directory must be physically deleted');
assert(batches.get('P0-ASSET-01')?.status === 'ACTIVE', 'facility cut batch must be ACTIVE');

if (errors.length > 0) {
  console.error(`City-01 unified asset validation failed (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `City-01 unified assets: ${policy.approvedFamilies.length} facility families, 12 support cuts and 7 modular grid lines approved; retired facility pack deleted.`
);
