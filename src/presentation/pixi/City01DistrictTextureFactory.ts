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

const drawResidentialAccessRoad = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const scaleX = width / 1024;
  const scaleY = height / 768;
  const lineScale = Math.min(scaleX, scaleY);

  context.save();
  context.scale(scaleX, scaleY);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const makeRoute = (): void => {
    context.beginPath();
    context.moveTo(512, 500);
    context.bezierCurveTo(514, 542, 506, 590, 496, 644);
  };

  makeRoute();
  context.strokeStyle = 'rgba(5, 14, 17, 0.55)';
  context.lineWidth = 30 * lineScale;
  context.stroke();

  const roadGradient = context.createLinearGradient(0, 500, 0, 670);
  roadGradient.addColorStop(0, 'rgba(49, 64, 67, 0.86)');
  roadGradient.addColorStop(0.72, 'rgba(49, 64, 67, 0.72)');
  roadGradient.addColorStop(1, 'rgba(49, 64, 67, 0)');
  makeRoute();
  context.strokeStyle = roadGradient;
  context.lineWidth = 20 * lineScale;
  context.stroke();

  const centerGradient = context.createLinearGradient(0, 520, 0, 666);
  centerGradient.addColorStop(0, 'rgba(215, 190, 105, 0.20)');
  centerGradient.addColorStop(0.72, 'rgba(215, 190, 105, 0.14)');
  centerGradient.addColorStop(1, 'rgba(215, 190, 105, 0)');
  makeRoute();
  context.setLineDash([9, 8]);
  context.strokeStyle = centerGradient;
  context.lineWidth = 2 * lineScale;
  context.stroke();
  context.restore();
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

  drawResidentialAccessRoad(context, width, height);

  const terrainHalo = makeLowerHalo(
    image,
    'rgba(25, 58, 48, 0.13)',
    Math.max(4, width * 0.01),
    Math.max(2, height * 0.0065),
    0.48
  );
  context.drawImage(terrainHalo, 0, 0);

  const contactShadow = makeLowerHalo(
    image,
    'rgba(2, 8, 10, 0.16)',
    Math.max(3, width * 0.006),
    Math.max(2, height * 0.005),
    0.56
  );
  context.drawImage(contactShadow, 0, 0);
  context.drawImage(image, 0, 0, width, height);

  const canvasSource = new CanvasSource({ resource: canvas });
  canvasSource.scaleMode = 'linear';
  return new Texture({ source: canvasSource });
};
