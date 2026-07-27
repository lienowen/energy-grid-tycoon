import { CanvasSource, Texture } from 'pixi.js';

type DistrictIntegrationKind = 'residential' | 'commercial' | 'industrial' | 'public' | 'old_town';
type RectSpec = readonly [x: number, y: number, width: number, height: number, radius: number];
type PointSpec = readonly [x: number, y: number];
type EllipseSpec = readonly [x: number, y: number, width: number, height: number];
type CutRectSpec = readonly [x: number, y: number, width: number, height: number];

interface DistrictMaskConfig {
  structureRects: readonly RectSpec[];
  corePolygon: readonly PointSpec[];
  vegetationExpandPx: number;
  vegetationBlurPx: number;
  featherPx: number;
  cutEllipses?: readonly EllipseSpec[];
  cutRects?: readonly CutRectSpec[];
}

const districtKinds = new Map<string, DistrictIntegrationKind>([
  ['commercial_district_residential_night', 'residential'],
  ['commercial_district_residential_blackout', 'residential'],
  ['commercial_district_commercial_night', 'commercial'],
  ['commercial_district_commercial_blackout', 'commercial'],
  ['commercial_district_industrial_night', 'industrial'],
  ['commercial_district_industrial_blackout', 'industrial'],
  ['commercial_district_public_night', 'public'],
  ['commercial_district_public_blackout', 'public'],
  ['commercial_district_old_town_night', 'old_town'],
  ['commercial_district_old_town_blackout', 'old_town']
]);

const maskConfigs: Record<DistrictIntegrationKind, DistrictMaskConfig> = {
  residential: {
    structureRects: [
      [225, 120, 210, 205, 24],
      [500, 120, 235, 205, 24]
    ],
    corePolygon: [
      [512, 190],
      [800, 345],
      [512, 480],
      [224, 345]
    ],
    vegetationExpandPx: 4,
    vegetationBlurPx: 2,
    featherPx: 3
  },
  commercial: {
    structureRects: [
      [230, 220, 230, 280, 24],
      [500, 235, 350, 270, 24],
      [425, 405, 230, 165, 22]
    ],
    corePolygon: [
      [512, 300],
      [790, 455],
      [512, 535],
      [230, 455]
    ],
    vegetationExpandPx: 2,
    vegetationBlurPx: 1,
    featherPx: 3,
    cutEllipses: [
      [570, 565, 120, 100]
    ],
    cutRects: [
      [0, 625, 1024, 143],
      [875, 520, 149, 248]
    ]
  },
  industrial: {
    structureRects: [
      [230, 245, 380, 255, 22],
      [565, 250, 290, 250, 22],
      [285, 390, 475, 200, 22]
    ],
    corePolygon: [
      [512, 300],
      [825, 450],
      [690, 545],
      [512, 605],
      [300, 555],
      [195, 455]
    ],
    vegetationExpandPx: 2,
    vegetationBlurPx: 1,
    featherPx: 3,
    cutRects: [
      [0, 610, 1024, 158],
      [0, 390, 180, 378],
      [855, 390, 169, 378],
      [755, 540, 269, 228]
    ]
  },
  public: {
    structureRects: [
      [185, 125, 300, 260, 24],
      [535, 205, 330, 205, 24]
    ],
    corePolygon: [
      [512, 230],
      [780, 355],
      [720, 390],
      [610, 410],
      [610, 470],
      [512, 520],
      [400, 470],
      [400, 410],
      [310, 395],
      [230, 360]
    ],
    vegetationExpandPx: 3,
    vegetationBlurPx: 2,
    featherPx: 3,
    cutRects: [
      [0, 530, 1024, 238],
      [0, 360, 145, 408],
      [875, 360, 149, 408],
      [270, 400, 90, 65],
      [625, 400, 90, 65]
    ]
  },
  old_town: {
    structureRects: [
      [175, 90, 365, 305, 22],
      [535, 165, 350, 240, 22],
      [315, 330, 320, 185, 22]
    ],
    corePolygon: [
      [512, 210],
      [790, 340],
      [720, 375],
      [620, 400],
      [620, 455],
      [585, 475],
      [512, 505],
      [430, 480],
      [400, 430],
      [300, 400],
      [220, 350]
    ],
    vegetationExpandPx: 3,
    vegetationBlurPx: 2,
    featherPx: 3,
    cutRects: [
      [0, 535, 1024, 233],
      [0, 350, 130, 418],
      [900, 340, 124, 428],
      [640, 380, 105, 75]
    ]
  }
};

const generatedTextures = new Map<string, Promise<Texture | undefined>>();

export const shouldGenerateCity01DistrictTexture = (assetId: string): boolean =>
  districtKinds.has(assetId);

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
  spec: RectSpec
): void => {
  const [x, y, width, height, radius] = spec;
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

const drawScaledPolygon = (
  context: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
  points: readonly PointSpec[]
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first[0] * scaleX, first[1] * scaleY);
  for (const point of points.slice(1)) {
    context.lineTo(point[0] * scaleX, point[1] * scaleY);
  }
  context.closePath();
  context.fill();
};

const makeVegetationMask = (
  sourceCanvas: HTMLCanvasElement,
  config: DistrictMaskConfig
): HTMLCanvasElement => {
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
  const scale = width / 1024;
  const radius = Math.max(1, Math.round(config.vegetationExpandPx * scale));
  for (let y = -radius; y <= radius; y += radius) {
    for (let x = -radius; x <= radius; x += radius) {
      expandedContext.drawImage(rawMask, x, y);
    }
  }
  expandedContext.filter = `blur(${Math.max(1, config.vegetationBlurPx * scale)}px)`;
  expandedContext.drawImage(expanded, 0, 0);
  expandedContext.filter = 'none';
  return expanded;
};

const cutMaskArtifacts = (
  context: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
  config: DistrictMaskConfig
): void => {
  if (!config.cutEllipses?.length && !config.cutRects?.length) return;
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.fillStyle = '#fff';
  for (const [x, y, width, height] of config.cutEllipses ?? []) {
    context.beginPath();
    context.ellipse(
      (x + width * 0.5) * scaleX,
      (y + height * 0.5) * scaleY,
      width * scaleX * 0.5,
      height * scaleY * 0.5,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
  }
  for (const [x, y, width, height] of config.cutRects ?? []) {
    context.fillRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
  }
  context.restore();
};

const makeIntegrationMask = (
  sourceCanvas: HTMLCanvasElement,
  kind: DistrictIntegrationKind
): HTMLCanvasElement => {
  const { width, height } = sourceCanvas;
  const scaleX = width / 1024;
  const scaleY = height / 768;
  const config = maskConfigs[kind];
  const structures = makeCanvas(width, height);
  const structureContext = structures.getContext('2d');
  if (!structureContext) return structures;

  structureContext.fillStyle = '#fff';
  for (const rect of config.structureRects) {
    drawScaledRoundedRect(structureContext, scaleX, scaleY, rect);
  }
  drawScaledPolygon(structureContext, scaleX, scaleY, config.corePolygon);
  structureContext.drawImage(makeVegetationMask(sourceCanvas, config), 0, 0);
  cutMaskArtifacts(structureContext, scaleX, scaleY, config);

  const feathered = makeCanvas(width, height);
  const featheredContext = feathered.getContext('2d');
  if (!featheredContext) return structures;
  featheredContext.filter = `blur(${Math.max(1, config.featherPx * (width / 1024))}px)`;
  featheredContext.drawImage(structures, 0, 0);
  featheredContext.filter = 'none';
  return feathered;
};

const buildTexture = async (
  source: string,
  kind: DistrictIntegrationKind
): Promise<Texture | undefined> => {
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
  outputContext.drawImage(makeIntegrationMask(sourceCanvas, kind), 0, 0);
  outputContext.globalCompositeOperation = 'source-over';

  const canvasSource = new CanvasSource({ resource: output });
  canvasSource.scaleMode = 'linear';
  return new Texture({ source: canvasSource });
};

export const createCity01DistrictTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  const kind = districtKinds.get(assetId);
  if (!kind) return Promise.resolve(undefined);
  const key = `${kind}:${source}`;
  const existing = generatedTextures.get(key);
  if (existing) return existing;
  const request = buildTexture(source, kind);
  generatedTextures.set(key, request);
  return request;
};
