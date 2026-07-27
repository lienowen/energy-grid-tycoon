import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const manifestPath = join(repoRoot, 'src/resources/runtime-art-admission-v1.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];
const warnings = [];

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const withinUnit = (point, label) => {
  assert(point && Number.isFinite(point.x) && Number.isFinite(point.y), `${label} must contain finite x/y`);
  if (!point) return;
  assert(point.x >= 0 && point.x <= 1, `${label}.x must be between 0 and 1`);
  assert(point.y >= 0 && point.y <= 1, `${label}.y must be between 0 and 1`);
};

const listJsonFiles = (directory) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(path);
    return entry.isFile() && extname(entry.name) === '.json' ? [path] : [];
  });
};

const paeth = (left, up, upLeft) => {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const diagonalDistance = Math.abs(prediction - upLeft);
  if (leftDistance <= upDistance && leftDistance <= diagonalDistance) return left;
  if (upDistance <= diagonalDistance) return up;
  return upLeft;
};

const decodePngDiagnostics = (path) => {
  const buffer = readFileSync(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('not a PNG file');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  const compressed = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error(`truncated PNG chunk ${type}`);
    const data = buffer.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  const diagnostics = {
    width,
    height,
    bitDepth,
    colorType,
    hasAlpha: colorType === 4 || colorType === 6,
    borderOpaqueRatio: null,
    subjectCoverage: null
  };

  if (bitDepth !== 8 || interlace !== 0 || !diagnostics.hasAlpha) return diagnostics;
  const bytesPerPixel = colorType === 6 ? 4 : 2;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(compressed));
  const expectedLength = (stride + 1) * height;
  if (inflated.length !== expectedLength) throw new Error(`unexpected decoded length ${inflated.length}, expected ${expectedLength}`);

  const rows = Array.from({ length: height }, () => Buffer.alloc(stride));
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const source = inflated.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const row = rows[y];
    const previous = y > 0 ? rows[y - 1] : undefined;
    for (let x = 0; x < stride; x += 1) {
      const raw = source[x];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 0) row[x] = raw;
      else if (filter === 1) row[x] = (raw + left) & 255;
      else if (filter === 2) row[x] = (raw + up) & 255;
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[x] = (raw + paeth(left, up, upLeft)) & 255;
      else throw new Error(`unsupported PNG filter ${filter}`);
    }
  }

  const alphaOffset = bytesPerPixel - 1;
  const borderSize = Math.max(1, Math.min(4, Math.floor(Math.min(width, height) / 32)));
  let borderPixels = 0;
  let opaqueBorderPixels = 0;
  let subjectPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rows[y][x * bytesPerPixel + alphaOffset];
      if (alpha > 16) subjectPixels += 1;
      const border = x < borderSize || x >= width - borderSize || y < borderSize || y >= height - borderSize;
      if (border) {
        borderPixels += 1;
        if (alpha > 16) opaqueBorderPixels += 1;
      }
    }
  }
  diagnostics.borderOpaqueRatio = borderPixels > 0 ? opaqueBorderPixels / borderPixels : 0;
  diagnostics.subjectCoverage = subjectPixels / (width * height);
  return diagnostics;
};

assert(manifest.schemaVersion === 1, 'runtime art admission manifest schemaVersion must be 1');
assert(Array.isArray(manifest.facilities), 'runtime art admission manifest must contain facilities[]');
assert(Array.isArray(manifest.shared), 'runtime art admission manifest must contain shared[]');

const records = [...(manifest.facilities ?? []), ...(manifest.shared ?? [])];
const ids = new Set();
const pathOwners = new Map();
const candidatePaths = new Set();
const approvedPaths = new Set();
const diagnostics = [];

for (const record of records) {
  assert(typeof record.id === 'string' && record.id.length > 0, 'every admission record must have an id');
  assert(!ids.has(record.id), `duplicate runtime art admission id: ${record.id}`);
  ids.add(record.id);
  assert(record.admission === 'candidate' || record.admission === 'approved', `${record.id}: admission must be candidate or approved`);
  assert(record.assets && typeof record.assets === 'object', `${record.id}: assets object is required`);

  if (record.footprint) {
    assert(Number.isInteger(record.footprint.width) && record.footprint.width > 0, `${record.id}: footprint.width must be a positive integer`);
    assert(Number.isInteger(record.footprint.height) && record.footprint.height > 0, `${record.id}: footprint.height must be a positive integer`);
  }
  if (record.anchor) withinUnit(record.anchor, `${record.id}.anchor`);
  if (record.connectionPoint) withinUnit(record.connectionPoint, `${record.id}.connectionPoint`);
  for (const [name, point] of Object.entries(record.fxPoints ?? {})) withinUnit(point, `${record.id}.fxPoints.${name}`);

  if (record.admission === 'candidate') {
    assert(Array.isArray(record.blockers) && record.blockers.length > 0, `${record.id}: candidate assets must declare blockers`);
  } else {
    assert(!record.blockers || record.blockers.length === 0, `${record.id}: approved assets cannot retain blockers`);
    assert(record.assets.base, `${record.id}: approved facility must provide a base asset`);
  }

  for (const [role, source] of Object.entries(record.assets ?? {})) {
    assert(typeof source === 'string' && source.startsWith('public/assets/'), `${record.id}.${role}: source must be under public/assets/`);
    if (typeof source !== 'string') continue;
    const owner = pathOwners.get(source);
    assert(!owner, `${record.id}.${role}: asset path is already assigned to ${owner}`);
    pathOwners.set(source, `${record.id}.${role}`);
    if (record.admission === 'candidate') candidatePaths.add(source);
    else approvedPaths.add(source);

    const absolute = join(repoRoot, source);
    assert(existsSync(absolute), `${record.id}.${role}: missing file ${source}`);
    if (!existsSync(absolute)) continue;
    try {
      const png = decodePngDiagnostics(absolute);
      diagnostics.push({ id: record.id, role, source, admission: record.admission, ...png });
      assert(png.width > 0 && png.height > 0, `${record.id}.${role}: PNG dimensions must be positive`);
      if (record.admission === 'approved') {
        assert(png.bitDepth === 8, `${record.id}.${role}: approved PNG must use 8-bit channels`);
        assert(png.hasAlpha, `${record.id}.${role}: approved PNG must include an alpha channel`);
        assert(png.borderOpaqueRatio !== null, `${record.id}.${role}: approved PNG alpha diagnostics could not be calculated`);
        if (png.borderOpaqueRatio !== null) {
          assert(png.borderOpaqueRatio <= manifest.policy.maximumBorderOpaqueRatio,
            `${record.id}.${role}: opaque border ratio ${png.borderOpaqueRatio.toFixed(4)} exceeds ${manifest.policy.maximumBorderOpaqueRatio}`);
        }
        if (png.subjectCoverage !== null) {
          assert(png.subjectCoverage >= manifest.policy.minimumSubjectCoverage,
            `${record.id}.${role}: subject coverage ${png.subjectCoverage.toFixed(4)} is too low`);
          assert(png.subjectCoverage <= manifest.policy.maximumSubjectCoverage,
            `${record.id}.${role}: subject coverage ${png.subjectCoverage.toFixed(4)} is too high`);
        }
      } else if (!png.hasAlpha || (png.borderOpaqueRatio ?? 1) > manifest.policy.maximumBorderOpaqueRatio) {
        warnings.push(`${record.id}.${role}: remains candidate; transparent-border gate is not satisfied`);
      }
    } catch (error) {
      errors.push(`${record.id}.${role}: cannot inspect ${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const catalogFiles = listJsonFiles(join(repoRoot, 'src/resources'))
  .filter((path) => /asset-catalog.*\.json$/.test(path));
const catalogText = catalogFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
for (const source of candidatePaths) {
  const publicSource = `/${relative(join(repoRoot, 'public'), join(repoRoot, source)).replaceAll('\\', '/')}`;
  assert(!catalogText.includes(publicSource), `candidate asset entered a runtime catalog: ${publicSource}`);
}
for (const source of approvedPaths) {
  const publicSource = `/${relative(join(repoRoot, 'public'), join(repoRoot, source)).replaceAll('\\', '/')}`;
  assert(catalogText.includes(publicSource), `approved asset is not registered in a runtime catalog: ${publicSource}`);
}

if (warnings.length > 0) {
  console.warn(`Runtime art admission warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
}

const candidateCount = records.filter((record) => record.admission === 'candidate').length;
const approvedCount = records.filter((record) => record.admission === 'approved').length;
console.log(`Runtime art admission: ${records.length} packs, ${candidateCount} candidate, ${approvedCount} approved, ${diagnostics.length} PNG files inspected.`);

if (errors.length > 0) {
  console.error(`Runtime art admission validation failed (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
