import { CanvasSource, Texture } from 'pixi.js';

const residentialAssetIds = new Set([
  'commercial_district_residential_night',
  'commercial_district_residential_blackout'
]);

export const shouldGenerateCity01DistrictTexture = (assetId: string): boolean =>
  residentialAssetIds.has(assetId);

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

const makeLowerHalo = (
  image: HTMLImageElement,
  color: string,
  blur: number,
  offsetY: number,
  clipRatio: number
): HTMLCanvasElement => {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const clipY = height * clipRatio;
  context.save();
  context.beginPath();
  context.rect(0, clipY, width, height - clipY);
  context.clip();
  context.filter = `blur(${blur}px)`;
  context.drawImage(image, 0, offsetY, width, height);
  context.filter = 'none';
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = color;
  context.fillRect(0, clipY, width, height - clipY);
  context.globalCompositeOperation = 'destination-out';
  context.drawImage(image, 0, 0, width, height);
  context.restore();
  return canvas;
};

const makeSoftenedLowerSource = (
  image: HTMLImageElement,
  blur: number,
  clipRatio: number
): HTMLCanvasElement => {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const sourceCanvas = makeCanvas(width, height);
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) return sourceCanvas;
  sourceContext.drawImage(image, 0, 0, width, height);

  const alphaMask = makeCanvas(width, height);
  const maskContext = alphaMask.getContext('2d');
  if (!maskContext) return sourceCanvas;
  maskContext.filter = `blur(${blur}px)`;
  maskContext.drawImage(image, 0, 0, width, height);
  maskContext.filter = 'none';

  const clipY = height * clipRatio;
  sourceContext.save();
  sourceContext.beginPath();
  sourceContext.rect(0, clipY, width, height - clipY);
  sourceContext.clip();
  sourceContext.globalCompositeOperation = 'destination-in';
  sourceContext.drawImage(alphaMask, 0, 0);
  sourceContext.restore();
  return sourceCanvas;
};

export const createCity01DistrictTexture = async (source: string): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;

  const image = await loadImage(source);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return undefined;

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  const terrainHalo = makeLowerHalo(
    image,
    'rgba(25, 58, 48, 0.12)',
    Math.max(4, width * 0.009),
    Math.max(2, height * 0.005),
    0.48
  );
  context.drawImage(terrainHalo, 0, 0);

  const contactShadow = makeLowerHalo(
    image,
    'rgba(2, 8, 10, 0.12)',
    Math.max(3, width * 0.005),
    Math.max(2, height * 0.004),
    0.58
  );
  context.drawImage(contactShadow, 0, 0);

  const softenedSource = makeSoftenedLowerSource(
    image,
    Math.max(2, width * 0.003),
    0.56
  );
  context.drawImage(softenedSource, 0, 0);

  const canvasSource = new CanvasSource({ resource: canvas });
  canvasSource.scaleMode = 'linear';
  return new Texture({ source: canvasSource });
};
