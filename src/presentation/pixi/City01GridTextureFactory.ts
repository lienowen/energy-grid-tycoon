import { CanvasSource, Texture } from 'pixi.js';

export interface City01GridCutSpec {
  crop?: { x: number; y: number; width: number; height: number };
  maxSubjectWidth: number;
  maxSubjectHeight: number;
}

const requests = new Map<string, Promise<Texture | undefined>>();

export const isCity01GridRuntimeAsset = (assetId: string): boolean =>
  assetId.startsWith('city01_grid_line_');

export const city01GridCutSpec = (assetId: string): City01GridCutSpec => {
  if (assetId === 'city01_grid_line_normal') {
    return {
      crop: { x: 105, y: 30, width: 371, height: 66 },
      maxSubjectWidth: 480,
      maxSubjectHeight: 44
    };
  }
  if (assetId === 'city01_grid_line_overload') {
    return {
      crop: { x: 105, y: 28, width: 387, height: 70 },
      maxSubjectWidth: 480,
      maxSubjectHeight: 48
    };
  }
  if (assetId === 'city01_grid_line_offline') {
    return {
      crop: { x: 105, y: 30, width: 385, height: 70 },
      maxSubjectWidth: 480,
      maxSubjectHeight: 44
    };
  }
  if (assetId === 'city01_grid_line_arc') {
    return { maxSubjectWidth: 470, maxSubjectHeight: 104 };
  }
  return { maxSubjectWidth: 480, maxSubjectHeight: 72 };
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
    image.onerror = () => reject(new Error(`Unable to load City-01 grid source: ${source}`));
    image.src = source;
  });

const textureFromCanvas = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({ resource: canvas });
  source.scaleMode = 'linear';
  return new Texture({ source });
};

const alphaBounds = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } => {
  const data = context.getImageData(0, 0, width, height).data;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) <= 8) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return { x: 0, y: 0, width, height };
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

const buildGridTexture = async (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const image = await loadImage(source);
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return undefined;
  const spec = city01GridCutSpec(assetId);
  const crop = spec.crop ?? {
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight
  };

  const sourceCanvas = makeCanvas(crop.width, crop.height);
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return undefined;
  sourceContext.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  const bounds = alphaBounds(sourceContext, crop.width, crop.height);
  const scale = Math.min(
    spec.maxSubjectWidth / bounds.width,
    spec.maxSubjectHeight / bounds.height
  );
  const targetWidth = Math.max(1, Math.round(bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(bounds.height * scale));
  const targetX = Math.round((512 - targetWidth) * 0.5);
  const targetY = Math.round((128 - targetHeight) * 0.5);

  const canvas = makeCanvas(512, 128);
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

export const createCity01GridRuntimeTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (!isCity01GridRuntimeAsset(assetId)) return Promise.resolve(undefined);
  const key = `${assetId}:${source}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = buildGridTexture(assetId, source);
  requests.set(key, request);
  return request;
};
