import { CanvasSource, Texture } from 'pixi.js';

const districtAssetPrefixes = [
  'commercial_district_residential_',
  'commercial_district_commercial_',
  'commercial_district_industrial_',
  'commercial_district_public_',
  'commercial_district_old_town_'
] as const;

const requests = new Map<string, Promise<Texture | undefined>>();

const clampByte = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

export const isCity01DistrictRuntimeAsset = (assetId: string): boolean =>
  districtAssetPrefixes.some((prefix) => assetId.startsWith(prefix));

export const softenCity01DistrictPixelAlpha = (
  originalAlpha: number,
  blurredMaskAlpha: number,
  red: number,
  green: number,
  blue: number,
  yRatio: number
): number => {
  if (originalAlpha <= 3) return 0;

  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const saturation = maximum > 0 ? ((maximum - minimum) / maximum) * 255 : 0;
  let alpha = (originalAlpha * blurredMaskAlpha) / 255;

  // The product district PNGs contain a dark raised underside. Removing only
  // that near the bottom edge makes the district sit on the shared map without
  // deleting authored streets, trees, fountains or buildings.
  if (
    yRatio > 0.79
    && maximum < 105
    && saturation < 70
    && blurredMaskAlpha < 245
  ) return 0;

  // Neutral dark pixels near an outer edge are platform/shadow pixels. Reduce
  // them strongly while preserving colourful vegetation, façades and vehicles.
  if (blurredMaskAlpha < 210 && maximum < 125 && saturation < 50) alpha *= 0.25;

  return clampByte(alpha);
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
    image.onerror = () => reject(new Error(`Unable to load City-01 district source: ${source}`));
    image.src = source;
  });

const textureFromCanvas = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({ resource: canvas });
  source.scaleMode = 'linear';
  return new Texture({ source });
};

const buildDistrictTexture = async (source: string): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const image = await loadImage(source);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return undefined;

  const sourceCanvas = makeCanvas(width, height);
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return undefined;
  sourceContext.drawImage(image, 0, 0, width, height);

  const hardMaskCanvas = makeCanvas(width, height);
  const hardMaskContext = hardMaskCanvas.getContext('2d');
  if (!hardMaskContext) return undefined;
  hardMaskContext.drawImage(image, 0, 0, width, height);
  hardMaskContext.globalCompositeOperation = 'source-in';
  hardMaskContext.fillStyle = '#ffffff';
  hardMaskContext.fillRect(0, 0, width, height);
  hardMaskContext.globalCompositeOperation = 'source-over';

  const softMaskCanvas = makeCanvas(width, height);
  const softMaskContext = softMaskCanvas.getContext('2d', { willReadFrequently: true });
  if (!softMaskContext) return undefined;
  softMaskContext.filter = 'blur(14px)';
  softMaskContext.drawImage(hardMaskCanvas, 0, 0);
  softMaskContext.filter = 'none';
  softMaskContext.globalCompositeOperation = 'destination-in';
  softMaskContext.drawImage(hardMaskCanvas, 0, 0);
  softMaskContext.globalCompositeOperation = 'source-over';

  const sourcePixels = sourceContext.getImageData(0, 0, width, height);
  const softMaskPixels = softMaskContext.getImageData(0, 0, width, height);
  for (let offset = 0; offset < sourcePixels.data.length; offset += 4) {
    const pixelIndex = offset / 4;
    const y = Math.floor(pixelIndex / width);
    sourcePixels.data[offset + 3] = softenCity01DistrictPixelAlpha(
      sourcePixels.data[offset + 3] ?? 0,
      softMaskPixels.data[offset + 3] ?? 0,
      sourcePixels.data[offset] ?? 0,
      sourcePixels.data[offset + 1] ?? 0,
      sourcePixels.data[offset + 2] ?? 0,
      y / Math.max(1, height - 1)
    );
  }

  const outputCanvas = makeCanvas(width, height);
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) return undefined;
  outputContext.putImageData(sourcePixels, 0, 0);
  return textureFromCanvas(outputCanvas);
};

export const createCity01DistrictRuntimeTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (!isCity01DistrictRuntimeAsset(assetId)) return Promise.resolve(undefined);
  const existing = requests.get(source);
  if (existing) return existing;
  const request = buildDistrictTexture(source);
  requests.set(source, request);
  return request;
};
