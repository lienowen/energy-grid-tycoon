import { CanvasSource, Texture } from 'pixi.js';

const residentialAssetIds = new Set([
  'commercial_district_residential_night',
  'commercial_district_residential_blackout'
]);

export const shouldGenerateCity01DistrictTexture = (assetId: string): boolean =>
  residentialAssetIds.has(assetId);

export const isCity01VegetationPixel = (
  red: number,
  green: number,
  blue: number,
  alpha: number
): boolean => alpha > 16
  && green > 55
  && green > red * 1.12
  && green > blue * 1.05;

const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load City-01 district source: ${source}`));
    image.src = source;
  });

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawScaledRoundedRect = (
  context: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  context.beginPath();
  context.roundRect(
    x * scaleX,
    y * scaleY,
    width * scaleX,
    height * scaleY,
    Math.min(scaleX, scaleY) * radius
  );
  context.fill();
};

const makeVegetationMask = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const { width, height } = sourceCanvas;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const rawMask = makeCanvas(width, height);
  const rawContext = rawMask.getContext('2d');
  if (!sourceContext || !rawContext) return rawMask;

  const sourceData = sourceContext.getImageData(0, 0, width, height);
  const maskData = rawContext.createImageData(width, height);
  for (let offset = 0; offset < sourceData.data.length; offset += 4) {
    if (!isCity01VegetationPixel(
      sourceData.data[offset] ?? 0,
      sourceData.data[offset + 1] ?? 0,
      sourceData.data[offset + 2] ?? 0,
      sourceData.data[offset + 3] ?? 0
    )) continue;
    maskData.data[offset] = 255;
    maskData.data[offset + 1] = 255;
    maskData.data[offset + 2] = 255;
    maskData.data[offset + 3] = 255;
  }
  rawContext.putImageData(maskData, 0, 0);

  const expanded = makeCanvas(width, height);
  const expandedContext = expanded.getContext('2d');
  if (!expandedContext) return rawMask;
  const radius = Math.max(2, Math.round(width / 256));
  for (let y = -radius; y <= radius; y += radius) {
    for (let x = -radius; x <= radius; x += radius) {
      expandedContext.drawImage(rawMask, x, y);
    }
  }
  expandedContext.filter = `blur(${Math.max(1, width / 512)}px)`;
  expandedContext.drawImage(expanded, 0, 0);
  expandedContext.filter = 'none';
  return expanded;
};

const makeIntegrationMask = (
  sourceCanvas: HTMLCanvasElement
): HTMLCanvasElement => {
  const { width, height } = sourceCanvas;
  const scaleX = width / 1024;
  const scaleY = height / 768;
  const structures = makeCanvas(width, height);
  const structureContext = structures.getContext('2d');
  if (!structureContext) return structures;

  structureContext.fillStyle = '#fff';
  drawScaledRoundedRect(structureContext, scaleX, scaleY, 225, 120, 210, 205, 24);
  drawScaledRoundedRect(structureContext, scaleX, scaleY, 500, 120, 235, 205, 24);
  structureContext.beginPath();
  structureContext.moveTo(512 * scaleX, 190 * scaleY);
  structureContext.lineTo(800 * scaleX, 345 * scaleY);
  structureContext.lineTo(512 * scaleX, 480 * scaleY);
  structureContext.lineTo(224 * scaleX, 345 * scaleY);
  structureContext.closePath();
  structureContext.fill();
  structureContext.drawImage(makeVegetationMask(sourceCanvas), 0, 0);

  const feathered = makeCanvas(width, height);
  const featheredContext = feathered.getContext('2d');
  if (!featheredContext) return structures;
  featheredContext.filter = `blur(${Math.max(2, width / 341)}px)`;
  featheredContext.drawImage(structures, 0, 0);
  featheredContext.filter = 'none';
  return feathered;
};

export const createCity01DistrictTexture = async (source: string): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;

  const image = await loadImage(source);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return undefined;

  const sourceCanvas = makeCanvas(width, height);
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return undefined;
  sourceContext.drawImage(image, 0, 0, width, height);

  const output = makeCanvas(width, height);
  const outputContext = output.getContext('2d');
  if (!outputContext) return undefined;
  outputContext.drawImage(sourceCanvas, 0, 0);
  outputContext.globalCompositeOperation = 'destination-in';
  outputContext.drawImage(makeIntegrationMask(sourceCanvas), 0, 0);
  outputContext.globalCompositeOperation = 'source-over';

  const canvasSource = new CanvasSource({ resource: output });
  canvasSource.scaleMode = 'linear';
  return new Texture({ source: canvasSource });
};
