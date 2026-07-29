import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scopePath = join(repoRoot, 'product-scope.json');
const readmePath = join(repoRoot, 'README.md');
const sliceDocPath = join(repoRoot, 'docs', 'COMMERCIAL_VERTICAL_SLICE.md');
const errors = [];

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

assert(existsSync(scopePath), 'product-scope.json is required');
assert(existsSync(readmePath), 'README.md is required');
assert(existsSync(sliceDocPath), 'docs/COMMERCIAL_VERTICAL_SLICE.md is required');

let scope = null;
try {
  scope = JSON.parse(readFileSync(scopePath, 'utf8'));
} catch (error) {
  errors.push(`product-scope.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (scope) {
  assert(scope.schemaVersion === 1, 'product scope schemaVersion must be 1');
  assert(scope.mode === 'commercial-vertical-slice', 'main must stay in commercial-vertical-slice mode');
  assert(scope.releaseCityId === 'city-01', 'City-01 must remain the only release target');
  assert(scope.expansionFrozen === true, 'expansionFrozen must remain true until the slice is approved');
  assert(typeof scope.storeReady === 'boolean', 'storeReady must be a boolean');

  const requiredBlockedWork = ['new-city', 'new-meta-system', 'new-resource-family'];
  assert(Array.isArray(scope.blockedWork), 'blockedWork must be an array');
  for (const item of requiredBlockedWork) {
    assert(scope.blockedWork?.includes(item), `blockedWork must include ${item}`);
  }

  const acceptanceKeys = [
    'firstFiveMinutesPlayable',
    'cityReadableWithoutLabels',
    'cityOccupiesAtLeast70Percent',
    'constructionChangesWorld',
    'blackoutRecoveryVisibleInWorld',
    'productionArtApproved',
    'desktopStoreScreenshotApproved',
    'mobileStoreScreenshotApproved'
  ];

  assert(scope.acceptance && typeof scope.acceptance === 'object', 'acceptance must be an object');
  for (const key of acceptanceKeys) {
    assert(typeof scope.acceptance?.[key] === 'boolean', `acceptance.${key} must be a boolean`);
  }

  if (scope.storeReady === true) {
    for (const key of acceptanceKeys) {
      assert(scope.acceptance?.[key] === true, `storeReady cannot be true while acceptance.${key} is false`);
    }
  }
}

if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, 'utf8');
  assert(readme.includes('当前主线：City-01 商业垂直切片'), 'README must declare the City-01 commercial slice as the current mainline');
  assert(readme.includes('未达到市场发布标准'), 'README must state that the current build is not market-ready');
  assert(!readme.includes('三座按配置解锁的城市地图与最好成绩'), 'README must not present three cities as current release content');
}

if (errors.length > 0) {
  console.error('Product scope validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Product scope validation passed: main is locked to the City-01 commercial vertical slice.');
