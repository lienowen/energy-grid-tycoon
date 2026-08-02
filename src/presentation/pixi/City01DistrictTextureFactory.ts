import { CanvasSource, Texture } from 'pixi.js';
import { CITY01_ART_V2 } from '../art-v2/City01ArtV2Theme';

const districtAssetPrefixes = [
  'commercial_district_residential_',
  'commercial_district_commercial_',
  'commercial_district_industrial_',
  'commercial_district_public_',
  'commercial_district_old_town_'
] as const;

export type City01DistrictRuntimeTreatment = 'public-v2' | 'legacy-softened' | 'none';

const requests = new Map<string, Promise<Texture | undefined>>();

const clampByte = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

const channel = (color: number, shift: number): number => (color >> shift) & 0xff;

const mixColor = (from: number, to: number, amount: number): number => {
  const mix = (shift: number): number => clampByte(
    channel(from, shift) + (channel(to, shift) - channel(from, shift)) * amount
  );
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
};

const cssColor = (color: number, alpha = 1): string =>
  `rgba(${channel(color, 16)}, ${channel(color, 8)}, ${channel(color, 0)}, ${alpha})`;

export const city01DistrictRuntimeTreatment = (
  assetId: string
): City01DistrictRuntimeTreatment => {
  if (assetId.startsWith('commercial_district_public_')) return 'public-v2';
  if (districtAssetPrefixes.some((prefix) => assetId.startsWith(prefix))) return 'legacy-softened';
  return 'none';
};

export const isCity01DistrictRuntimeAsset = (assetId: string): boolean =>
  city01DistrictRuntimeTreatment(assetId) !== 'none';

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

const polygon = (
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  fill: string,
  stroke?: string,
  lineWidth = 1
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) context.lineTo(point[0], point[1]);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  }
};

interface PrismPalette {
  top: number;
  left: number;
  right: number;
  edge: number;
  glass: number;
}

interface PrismGeometry {
  centerX: number;
  baseY: number;
  width: number;
  depth: number;
  height: number;
}

const drawIsoPrism = (
  context: CanvasRenderingContext2D,
  geometry: PrismGeometry,
  palette: PrismPalette
): void => {
  const { centerX, baseY, width, depth, height } = geometry;
  const top = [centerX, baseY - depth * 0.5 - height] as const;
  const right = [centerX + width * 0.5, baseY - height] as const;
  const bottom = [centerX, baseY + depth * 0.5 - height] as const;
  const left = [centerX - width * 0.5, baseY - height] as const;
  const groundRight = [centerX + width * 0.5, baseY] as const;
  const groundBottom = [centerX, baseY + depth * 0.5] as const;
  const groundLeft = [centerX - width * 0.5, baseY] as const;

  polygon(context, [left, bottom, groundBottom, groundLeft], cssColor(palette.left), cssColor(palette.edge, 0.45), 1.2);
  polygon(context, [right, bottom, groundBottom, groundRight], cssColor(palette.right), cssColor(palette.edge, 0.45), 1.2);
  polygon(context, [top, right, bottom, left], cssColor(palette.top), cssColor(palette.edge, 0.55), 1.2);

  const windowAlpha = 0.72;
  const leftWindowTop = baseY - height + depth * 0.05;
  const leftWindowBottom = baseY - height * 0.2;
  for (let index = 0; index < 4; index += 1) {
    const ratio = (index + 1) / 5;
    const x = centerX - width * 0.48 + width * 0.42 * ratio;
    polygon(context, [
      [x - 7, leftWindowTop + index * 1.2],
      [x + 8, leftWindowTop + 8 + index * 1.2],
      [x + 8, leftWindowBottom + 8],
      [x - 7, leftWindowBottom]
    ], cssColor(palette.glass, windowAlpha));
  }
  for (let index = 0; index < 4; index += 1) {
    const ratio = (index + 1) / 5;
    const x = centerX + width * 0.08 + width * 0.4 * ratio;
    polygon(context, [
      [x - 7, leftWindowTop + 8 - index * 1.2],
      [x + 8, leftWindowTop - index * 1.2],
      [x + 8, leftWindowBottom],
      [x - 7, leftWindowBottom + 8]
    ], cssColor(palette.glass, windowAlpha));
  }
};

const drawContactShadow = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): void => {
  context.save();
  context.filter = 'blur(8px)';
  context.beginPath();
  context.ellipse(centerX + 7, centerY + 5, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(1, 10, 14, .2)';
  context.fill();
  context.restore();
};

const drawSolarRoof = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
  glass: number
): void => {
  polygon(context, [
    [centerX, centerY - depth * 0.5],
    [centerX + width * 0.5, centerY],
    [centerX, centerY + depth * 0.5],
    [centerX - width * 0.5, centerY]
  ], cssColor(glass, 0.88), cssColor(CITY01_ART_V2.palette.ui.accentBright, 0.46), 1);
  context.strokeStyle = cssColor(CITY01_ART_V2.palette.ui.textPrimary, 0.32);
  context.lineWidth = 0.8;
  for (const offset of [-0.25, 0, 0.25]) {
    context.beginPath();
    context.moveTo(centerX - width * 0.5 * (1 - Math.abs(offset)), centerY + depth * offset);
    context.lineTo(centerX + width * 0.5 * (1 - Math.abs(offset)), centerY + depth * offset);
    context.stroke();
  }
};

const drawTree = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  foliage: number
): void => {
  context.fillStyle = cssColor(mixColor(foliage, CITY01_ART_V2.palette.ui.panel, 0.42));
  context.fillRect(x - 2 * scale, y - 12 * scale, 4 * scale, 14 * scale);
  context.beginPath();
  context.arc(x, y - 16 * scale, 9 * scale, 0, Math.PI * 2);
  context.fillStyle = cssColor(foliage, 0.96);
  context.fill();
  context.beginPath();
  context.arc(x - 5 * scale, y - 13 * scale, 6 * scale, 0, Math.PI * 2);
  context.arc(x + 5 * scale, y - 13 * scale, 6 * scale, 0, Math.PI * 2);
  context.fillStyle = cssColor(mixColor(foliage, CITY01_ART_V2.palette.ui.accentBright, 0.16), 0.92);
  context.fill();
};

const publicDistrictStatusPalette = (assetId: string): {
  glass: number;
  accent: number;
  foliage: number;
  intensity: number;
} => {
  if (assetId.endsWith('_blackout')) {
    return {
      glass: CITY01_ART_V2.palette.status.muted,
      accent: CITY01_ART_V2.palette.status.danger,
      foliage: mixColor(CITY01_ART_V2.palette.status.positive, CITY01_ART_V2.palette.ui.panel, 0.56),
      intensity: 0.72
    };
  }
  return {
    glass: CITY01_ART_V2.palette.status.information,
    accent: CITY01_ART_V2.palette.status.positive,
    foliage: mixColor(CITY01_ART_V2.palette.status.positive, CITY01_ART_V2.palette.ui.accent, 0.22),
    intensity: 1
  };
};

const buildPublicDistrictV2Texture = (assetId: string): Texture | undefined => {
  if (typeof document === 'undefined') return undefined;
  const canvas = makeCanvas(640, 420);
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  const status = publicDistrictStatusPalette(assetId);
  const theme = CITY01_ART_V2.palette;
  const light = mixColor(theme.building.coolTint, theme.ui.textPrimary, 0.18);
  const top = mixColor(light, theme.ui.accentBright, 0.06);
  const left = mixColor(light, theme.ui.panel, 0.12);
  const right = mixColor(light, theme.ui.panel, 0.24);
  const edge = mixColor(theme.ui.borderStrong, theme.ui.panel, 0.12);
  const palette: PrismPalette = { top, left, right, edge, glass: status.glass };
  context.globalAlpha = status.intensity;

  // Only local paths and contact shadows are drawn; there is no rectangular
  // platform, so the district remains grounded by the shared Tile World.
  drawContactShadow(context, 320, 324, 205, 44);
  context.strokeStyle = cssColor(theme.road.shoulder, 0.18);
  context.lineWidth = 8;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(180, 300);
  context.lineTo(305, 245);
  context.lineTo(430, 285);
  context.lineTo(500, 326);
  context.stroke();
  context.strokeStyle = cssColor(theme.road.asphalt, 0.3);
  context.lineWidth = 4;
  context.stroke();

  // Research center — compact rear-left block with an energy tower.
  drawIsoPrism(context, { centerX: 226, baseY: 245, width: 118, depth: 58, height: 72 }, palette);
  drawSolarRoof(context, 226, 174, 72, 28, status.glass);
  drawIsoPrism(context, { centerX: 278, baseY: 221, width: 34, depth: 26, height: 106 }, {
    ...palette,
    glass: mixColor(status.glass, theme.ui.accentBright, 0.14)
  });

  // Community hospital — broad rear-right volume with a rooftop solar canopy.
  drawIsoPrism(context, { centerX: 405, baseY: 232, width: 146, depth: 66, height: 64 }, palette);
  drawSolarRoof(context, 405, 167, 96, 34, status.glass);
  context.fillStyle = cssColor(status.accent, 0.88);
  context.fillRect(396, 187, 18, 5);
  context.fillRect(402.5, 180.5, 5, 18);

  // City hall — the main foreground landmark, lower and wider than the old
  // monolithic collage so surrounding roads and the public plaza remain visible.
  drawIsoPrism(context, { centerX: 270, baseY: 327, width: 158, depth: 76, height: 78 }, palette);
  drawIsoPrism(context, { centerX: 270, baseY: 281, width: 70, depth: 42, height: 44 }, {
    ...palette,
    top: mixColor(top, theme.ui.accentBright, 0.08)
  });
  context.beginPath();
  context.ellipse(270, 224, 34, 14, 0, Math.PI, Math.PI * 2);
  context.fillStyle = cssColor(mixColor(status.glass, theme.ui.textPrimary, 0.16), 0.9);
  context.fill();
  context.strokeStyle = cssColor(edge, 0.45);
  context.lineWidth = 1.2;
  context.stroke();

  // Public service pavilion and plaza — intentionally separated from the
  // buildings so future asset swaps can replace each module independently.
  drawIsoPrism(context, { centerX: 450, baseY: 310, width: 102, depth: 50, height: 42 }, palette);
  polygon(context, [
    [444, 315], [526, 352], [454, 386], [372, 349]
  ], cssColor(mixColor(theme.building.publicFootprint, theme.ui.panel, 0.08), 0.22), cssColor(theme.ui.border, 0.18), 1);
  context.beginPath();
  context.ellipse(452, 347, 32, 14, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(theme.ui.panelRaised, 0.52);
  context.fill();
  context.strokeStyle = cssColor(status.accent, 0.7);
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.ellipse(452, 343, 22, 9, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(status.glass, 0.48);
  context.fill();
  context.beginPath();
  context.moveTo(452, 343);
  context.quadraticCurveTo(444, 324, 452, 315);
  context.quadraticCurveTo(460, 324, 452, 343);
  context.strokeStyle = cssColor(theme.ocean.foam, 0.7);
  context.lineWidth = 2;
  context.stroke();

  for (const [x, y, scale] of [
    [154, 311, 0.9], [190, 348, 0.76], [354, 363, 0.72],
    [514, 332, 0.8], [498, 381, 0.64], [321, 196, 0.6]
  ] as const) drawTree(context, x, y, scale, status.foliage);

  // Small energy beacons make the district read as a modern clean-energy city
  // without introducing floating UI or textual signage.
  for (const [x, y] of [[171, 278], [337, 333], [535, 311]] as const) {
    context.beginPath();
    context.arc(x, y - 14, 3.2, 0, Math.PI * 2);
    context.fillStyle = cssColor(status.accent, 0.86);
    context.shadowColor = cssColor(status.accent, 0.64);
    context.shadowBlur = 8;
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = cssColor(edge, 0.7);
    context.fillRect(x - 1.2, y - 12, 2.4, 15);
  }

  return textureFromCanvas(canvas);
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
  const treatment = city01DistrictRuntimeTreatment(assetId);
  if (treatment === 'none') return Promise.resolve(undefined);
  const cacheKey = treatment === 'public-v2' ? assetId : source;
  const existing = requests.get(cacheKey);
  if (existing) return existing;
  const request = treatment === 'public-v2'
    ? Promise.resolve(buildPublicDistrictV2Texture(assetId))
    : buildDistrictTexture(source);
  requests.set(cacheKey, request);
  return request;
};
