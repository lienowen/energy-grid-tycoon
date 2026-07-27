import { CanvasSource, Texture } from 'pixi.js';

type RuntimeTextureKind = 'coast-blend' | 'road-crop';

const coastAssetIds = new Set([
  'terrain_riverfront_base',
  'terrain_road_bridge_base',
  'terrain_seafront_base',
  'terrain_beach_open_base',
  'terrain_harbor_pier_base',
  'terrain_coast_cliff_base'
]);

const ROAD_CONNECTOR_ID = 'city01_road_connector_short';
const requests = new Map<string, Promise<Texture | undefined>>();

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const city01RuntimeTextureKind = (assetId: string): RuntimeTextureKind | undefined => {
  if (assetId === ROAD_CONNECTOR_ID) return 'road-crop';
  if (coastAssetIds.has(assetId)) return 'coast-blend';
  return undefined;
};

export const isCity01WaterPixel = (
  red: number,
  green: number,
  blue: number,
  alpha: number
): boolean => alpha > 8
  && blue > 70
  && green > 65
  && blue > red * 1.18
  && green > red * 1.08
  && blue + green - red * 2 > 45;

export const matchCity01WaterColor = (
  red: number,
  green: number,
  blue: number,
  alpha: number
): readonly [number, number, number, number] => {
  if (!isCity01WaterPixel(red, green, blue, alpha)) return [red, green, blue, alpha];
  const light = clamp((green + blue) * 0.5 - 105, -25, 110);
  return [
    Math.round(clamp(6 + light * 0.1, 0, 255)),
    Math.round(clamp(65 + light * 0.38, 0, 255)),
    Math.round(clamp(80 + light * 0.5, 0, 255)),
    Math.round(clamp(alpha * 0.92, 0, 255))
  ];
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
    image.onerror = () => reject(new Error(`Unable to load City-01 runtime source: ${source}`));
    image.src = source;
  });

const textureFromCanvas = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({ resource: canvas });
  source.scaleMode = 'linear';
  return new Texture({ source });
};

const blendCoastWater = (image: HTMLImageElement): Texture | undefined => {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return undefined;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const red = pixels.data[offset] ?? 0;
    const green = pixels.data[offset + 1] ?? 0;
    const blue = pixels.data[offset + 2] ?? 0;
    const alpha = pixels.data[offset + 3] ?? 0;
    const matched = matchCity01WaterColor(red, green, blue, alpha);
    pixels.data[offset] = matched[0];
    pixels.data[offset + 1] = matched[1];
    pixels.data[offset + 2] = matched[2];
    pixels.data[offset + 3] = matched[3];
  }
  context.putImageData(pixels, 0, 0);
  return textureFromCanvas(canvas);
};

const cropRoadConnector = (image: HTMLImageElement): Texture | undefined => {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return undefined;

  const sourceX = width * (210 / 1024);
  const sourceY = height * (300 / 768);
  const sourceWidth = width * (610 / 1024);
  const sourceHeight = height * (260 / 768);
  const canvas = makeCanvas(sourceWidth, sourceHeight);
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return textureFromCanvas(canvas);
};

const buildRuntimeTexture = async (
  kind: RuntimeTextureKind,
  source: string
): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const image = await loadImage(source);
  return kind === 'coast-blend'
    ? blendCoastWater(image)
    : cropRoadConnector(image);
};

export const createCity01RuntimeTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  const kind = city01RuntimeTextureKind(assetId);
  if (!kind) return Promise.resolve(undefined);
  const key = `${kind}:${source}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = buildRuntimeTexture(kind, source);
  requests.set(key, request);
  return request;
};
