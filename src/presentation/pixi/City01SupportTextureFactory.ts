import { CanvasSource, Texture } from 'pixi.js';

export interface City01SupportCanvasSpec {
  width: number;
  height: number;
  maxSubjectWidth: number;
  maxSubjectHeight: number;
  anchorY: number;
}

const requests = new Map<string, Promise<Texture | undefined>>();

export const isCity01SupportRuntimeAsset = (assetId: string): boolean =>
  assetId.startsWith('city01_ground_')
  || assetId.startsWith('city01_placement_')
  || assetId.startsWith('city01_fx_');

export const city01SupportCanvasSpec = (assetId: string): City01SupportCanvasSpec => {
  if (assetId.startsWith('city01_ground_')) {
    return {
      width: 512,
      height: 256,
      maxSubjectWidth: 486,
      maxSubjectHeight: 216,
      anchorY: 0.82
    };
  }
  if (assetId.startsWith('city01_placement_')) {
    return {
      width: 512,
      height: 256,
      maxSubjectWidth: 452,
      maxSubjectHeight: 214,
      anchorY: 0.72
    };
  }
  if (assetId.includes('smoke')) {
    return {
      width: 512,
      height: 512,
      maxSubjectWidth: 280,
      maxSubjectHeight: 350,
      anchorY: 0.85
    };
  }
  if (assetId === 'city01_fx_spark') {
    return {
      width: 512,
      height: 512,
      maxSubjectWidth: 360,
      maxSubjectHeight: 190,
      anchorY: 0.55
    };
  }
  return {
    width: 512,
    height: 512,
    maxSubjectWidth: 390,
    maxSubjectHeight: 390,
    anchorY: 0.72
  };
};

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
    image.onerror = () => reject(new Error(`Unable to load City-01 support source: ${source}`));
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

const alphaBounds = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): AlphaBounds => {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3] ?? 0;
      if (alpha <= 12) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return { x: 0, y: 0, width, height };
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1
  };
};

const buildTexture = async (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const image = await loadImage(source);
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return undefined;

  const sourceCanvas = makeCanvas(image.naturalWidth, image.naturalHeight);
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return undefined;
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
  const bounds = alphaBounds(pixels.data, image.naturalWidth, image.naturalHeight);
  const spec = city01SupportCanvasSpec(assetId);
  const scale = Math.min(
    spec.maxSubjectWidth / bounds.width,
    spec.maxSubjectHeight / bounds.height
  );
  const targetWidth = Math.max(1, Math.round(bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(bounds.height * scale));
  const targetX = Math.round((spec.width - targetWidth) * 0.5);
  const baseline = Math.round(spec.height * spec.anchorY);
  const targetY = Math.round(baseline - targetHeight);

  const canvas = makeCanvas(spec.width, spec.height);
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
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
  return textureFromCanvas(canvas);
};

export const createCity01SupportRuntimeTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (!isCity01SupportRuntimeAsset(assetId)) return Promise.resolve(undefined);
  const key = `${assetId}:${source}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = buildTexture(assetId, source);
  requests.set(key, request);
  return request;
};
