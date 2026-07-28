import { CanvasSource, Texture } from 'pixi.js';

export const CITY01_FACILITY_CANVAS = {
  width: 512,
  height: 512,
  anchorY: 0.9115,
  baseline: Math.round(512 * 0.9115)
} as const;

export interface City01FacilityCanvasSpec {
  maxSubjectWidth: number;
  maxSubjectHeight: number;
}

const facilityPrefixes = [
  'commercial_facility_battery_utility_',
  'commercial_facility_solar_',
  'commercial_facility_wind_',
  'commercial_facility_gas_',
  'commercial_facility_battery_',
  'commercial_facility_substation_',
  'world_facility_grid_node_'
] as const;

const requests = new Map<string, Promise<Texture | undefined>>();

export const isCity01FacilityRuntimeAsset = (assetId: string): boolean =>
  facilityPrefixes.some((prefix) => assetId.startsWith(prefix));

export const city01FacilityCanvasSpec = (assetId: string): City01FacilityCanvasSpec => {
  if (assetId.startsWith('commercial_facility_battery_utility_')) {
    return { maxSubjectWidth: 448, maxSubjectHeight: 350 };
  }
  if (assetId.startsWith('commercial_facility_solar_')) {
    return { maxSubjectWidth: 430, maxSubjectHeight: 360 };
  }
  if (assetId.startsWith('commercial_facility_wind_')) {
    return { maxSubjectWidth: 300, maxSubjectHeight: 430 };
  }
  if (assetId.startsWith('commercial_facility_gas_')) {
    return { maxSubjectWidth: 440, maxSubjectHeight: 390 };
  }
  if (assetId.startsWith('commercial_facility_battery_')) {
    return { maxSubjectWidth: 426, maxSubjectHeight: 342 };
  }
  if (assetId.startsWith('commercial_facility_substation_')) {
    return { maxSubjectWidth: 446, maxSubjectHeight: 346 };
  }
  if (assetId.startsWith('world_facility_grid_node_')) {
    return { maxSubjectWidth: 318, maxSubjectHeight: 420 };
  }
  return { maxSubjectWidth: 420, maxSubjectHeight: 380 };
};

// Retained for callers and tests that compare the relative visual footprint.
export const city01FacilitySubjectScale = (assetId: string): number =>
  city01FacilityCanvasSpec(assetId).maxSubjectWidth / CITY01_FACILITY_CANVAS.width;

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load City-01 facility source: ${source}`));
    image.src = source;
  });

const textureFromCanvas = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({ resource: canvas });
  source.scaleMode = 'linear';
  return new Texture({ source });
};

interface AlphaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const weightedAlphaBounds = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): AlphaBounds => {
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3] ?? 0;
      if (alpha <= 8) continue;
      columns[x] += alpha;
      rows[y] += alpha;
      total += alpha;
    }
  }

  if (total <= 0) return { x: 0, y: 0, width, height };
  const trim = total * 0.0005;

  let left = 0;
  let accumulated = 0;
  while (left < width - 1 && accumulated + columns[left]! <= trim) {
    accumulated += columns[left]!;
    left += 1;
  }

  let right = width - 1;
  accumulated = 0;
  while (right > left && accumulated + columns[right]! <= trim) {
    accumulated += columns[right]!;
    right -= 1;
  }

  let top = 0;
  accumulated = 0;
  while (top < height - 1 && accumulated + rows[top]! <= trim) {
    accumulated += rows[top]!;
    top += 1;
  }

  let bottom = height - 1;
  accumulated = 0;
  while (bottom > top && accumulated + rows[bottom]! <= trim) {
    accumulated += rows[bottom]!;
    bottom -= 1;
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1)
  };
};

const shouldDeriveOfflineStyle = (assetId: string): boolean =>
  assetId === 'commercial_facility_wind_offline';

const buildFacilityTexture = async (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const image = await loadImage(source);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (sourceWidth <= 0 || sourceHeight <= 0) return undefined;

  const sourceCanvas = makeCanvas(sourceWidth, sourceHeight);
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return undefined;
  sourceContext.drawImage(image, 0, 0);
  const imageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
  const bounds = weightedAlphaBounds(imageData.data, sourceWidth, sourceHeight);

  const spec = city01FacilityCanvasSpec(assetId);
  const scale = Math.min(
    spec.maxSubjectWidth / bounds.width,
    spec.maxSubjectHeight / bounds.height
  );
  const targetWidth = Math.max(1, Math.round(bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(bounds.height * scale));
  const targetX = Math.round((CITY01_FACILITY_CANVAS.width - targetWidth) * 0.5);
  const targetY = CITY01_FACILITY_CANVAS.baseline - targetHeight;

  const canvas = makeCanvas(CITY01_FACILITY_CANVAS.width, CITY01_FACILITY_CANVAS.height);
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (shouldDeriveOfflineStyle(assetId)) {
    context.filter = 'grayscale(86%) saturate(42%) brightness(62%)';
  }
  context.drawImage(
    sourceCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight
  );
  context.filter = 'none';
  return textureFromCanvas(canvas);
};

export const createCity01FacilityRuntimeTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (!isCity01FacilityRuntimeAsset(assetId)) return Promise.resolve(undefined);
  const key = `${assetId}:${source}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = buildFacilityTexture(assetId, source);
  requests.set(key, request);
  return request;
};
