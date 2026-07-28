import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = join(repoRoot, 'src/resources/city01-unified-runtime-asset-policy.json');
const catalogPath = join(repoRoot, 'src/resources/City01UnifiedFacilityCatalog.ts');
const globalCatalogPath = join(repoRoot, 'src/resources/GlobalAssetCatalog.ts');
const retiredCatalogPath = join(repoRoot, 'src/resources/asset-catalog-city01-facility-runtime.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const catalogSource = readFileSync(catalogPath, 'utf8');
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
  assert(catalogSource.includes(family.folder),
    `${family.id}: unified catalog does not reference folder ${family.folder}`);

  const folder = family.folder;
  for (const rawState of family.states ?? []) {
    const state = String(rawState).split(':')[0];
    const file = join(repoRoot, 'public/assets/single/v1', folder, `${folder}__${state}.png`);
    assert(existsSync(file), `${family.id}: approved cut is missing: ${file.replace(`${repoRoot}/`, '')}`);
  }
}

const retiredRuntimeEntryPattern = /src\s*:\s*[`'\"]\/assets\/city01\/product\/facilities\//;
assert(!retiredRuntimeEntryPattern.test(catalogSource),
  'unified facility catalog contains a runtime entry from the retired mislabeled directory');
assert(globalCatalogSource.includes('retiredCity01FacilitySourcePrefix'),
  'global catalog must filter the retired City-01 facility source prefix');
assert(globalCatalogSource.includes('city01UnifiedFacilityCatalog'),
  'global catalog must merge the unified City-01 facility catalog');
assert(!globalCatalogSource.includes('asset-catalog-city01-facility-runtime.json'),
  'global catalog still imports the retired facility runtime JSON');
assert(!existsSync(retiredCatalogPath),
  'retired asset-catalog-city01-facility-runtime.json must be deleted');

const batches = new Map((policy.cutBatches ?? []).map((batch) => [batch.id, batch]));
assert(batches.get('P0-ASSET-01')?.status === 'ACTIVE', 'facility cut batch must be ACTIVE');
assert(batches.get('P0-ASSET-02')?.status === 'CUTTING', 'ground cut batch must be CUTTING');
assert(batches.get('P0-ASSET-03')?.status === 'CUTTING', 'placement cut batch must be CUTTING');
assert(batches.get('P0-ASSET-04')?.status === 'CUTTING', 'effect cut batch must be CUTTING');
assert(batches.get('P0-ASSET-05')?.status === 'PENDING_CUT', 'grid line cut batch must remain PENDING_CUT');

if (errors.length > 0) {
  console.error(`City-01 unified asset validation failed (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`City-01 unified assets: ${policy.approvedFamilies.length} facility families approved; old mislabeled runtime pack retired.`);
