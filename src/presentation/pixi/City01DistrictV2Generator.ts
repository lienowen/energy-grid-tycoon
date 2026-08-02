import { CanvasSource, Texture } from 'pixi.js';
import { CITY01_ART_V2 } from '../art-v2/City01ArtV2Theme';

export type City01GeneratedDistrictKind = 'public' | 'industrial' | 'old-town';

const THEME = CITY01_ART_V2.palette;

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

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

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
  palette: PrismPalette,
  windowRows = 1
): void => {
  const { centerX, baseY, width, depth, height } = geometry;
  const top = [centerX, baseY - depth * 0.5 - height] as const;
  const right = [centerX + width * 0.5, baseY - height] as const;
  const bottom = [centerX, baseY + depth * 0.5 - height] as const;
  const left = [centerX - width * 0.5, baseY - height] as const;
  const groundRight = [centerX + width * 0.5, baseY] as const;
  const groundBottom = [centerX, baseY + depth * 0.5] as const;
  const groundLeft = [centerX - width * 0.5, baseY] as const;

  polygon(context, [left, bottom, groundBottom, groundLeft], cssColor(palette.left), cssColor(palette.edge, 0.5), 1.15);
  polygon(context, [right, bottom, groundBottom, groundRight], cssColor(palette.right), cssColor(palette.edge, 0.5), 1.15);
  polygon(context, [top, right, bottom, left], cssColor(palette.top), cssColor(palette.edge, 0.58), 1.15);

  const columns = width > 100 ? 4 : 3;
  for (let row = 0; row < windowRows; row += 1) {
    const rowTop = baseY - height + 14 + row * 20;
    const rowBottom = Math.min(baseY - 9, rowTop + 11);
    if (rowBottom <= rowTop) continue;
    for (let index = 0; index < columns; index += 1) {
      const ratio = (index + 1) / (columns + 1);
      const leftX = centerX - width * 0.48 + width * 0.42 * ratio;
      polygon(context, [
        [leftX - 6, rowTop],
        [leftX + 7, rowTop + 7],
        [leftX + 7, rowBottom + 7],
        [leftX - 6, rowBottom]
      ], cssColor(palette.glass, 0.7));
      const rightX = centerX + width * 0.08 + width * 0.4 * ratio;
      polygon(context, [
        [rightX - 6, rowTop + 7],
        [rightX + 7, rowTop],
        [rightX + 7, rowBottom],
        [rightX - 6, rowBottom + 7]
      ], cssColor(palette.glass, 0.7));
    }
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
  context.ellipse(centerX + 8, centerY + 6, radiusX, radiusY, 0, 0, Math.PI * 2);
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
  ], cssColor(glass, 0.88), cssColor(THEME.ui.accentBright, 0.42), 1);
  context.strokeStyle = cssColor(THEME.ui.textPrimary, 0.3);
  context.lineWidth = 0.75;
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
  context.fillStyle = cssColor(mixColor(foliage, THEME.ui.panel, 0.42));
  context.fillRect(x - 2 * scale, y - 12 * scale, 4 * scale, 14 * scale);
  context.beginPath();
  context.arc(x, y - 16 * scale, 9 * scale, 0, Math.PI * 2);
  context.fillStyle = cssColor(foliage, 0.96);
  context.fill();
  context.beginPath();
  context.arc(x - 5 * scale, y - 13 * scale, 6 * scale, 0, Math.PI * 2);
  context.arc(x + 5 * scale, y - 13 * scale, 6 * scale, 0, Math.PI * 2);
  context.fillStyle = cssColor(mixColor(foliage, THEME.ui.accentBright, 0.16), 0.92);
  context.fill();
};

const drawBeacon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  accent: number
): void => {
  context.beginPath();
  context.arc(x, y - 14, 3.2, 0, Math.PI * 2);
  context.fillStyle = cssColor(accent, 0.88);
  context.shadowColor = cssColor(accent, 0.62);
  context.shadowBlur = 8;
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = cssColor(THEME.ui.borderStrong, 0.72);
  context.fillRect(x - 1.2, y - 12, 2.4, 15);
};

const drawRoadRibbon = (
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>
): void => {
  const first = points[0];
  if (!first) return;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) context.lineTo(point[0], point[1]);
  context.strokeStyle = cssColor(THEME.road.shoulder, 0.18);
  context.lineWidth = 8;
  context.stroke();
  context.strokeStyle = cssColor(THEME.road.asphalt, 0.3);
  context.lineWidth = 4;
  context.stroke();
};

const drawCylinder = (
  context: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  radiusX: number,
  radiusY: number,
  height: number,
  body: number,
  top: number,
  edge: number
): void => {
  context.fillStyle = cssColor(body);
  context.fillRect(x - radiusX, baseY - height, radiusX * 2, height);
  context.beginPath();
  context.ellipse(x, baseY - height, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(top);
  context.fill();
  context.strokeStyle = cssColor(edge, 0.48);
  context.lineWidth = 1;
  context.stroke();
  context.beginPath();
  context.ellipse(x, baseY, radiusX, radiusY, 0, 0, Math.PI);
  context.strokeStyle = cssColor(edge, 0.4);
  context.stroke();
};

const statusPalette = (assetId: string): {
  glass: number;
  accent: number;
  foliage: number;
  intensity: number;
} => {
  if (assetId.endsWith('_blackout')) {
    return {
      glass: THEME.status.muted,
      accent: THEME.status.danger,
      foliage: mixColor(THEME.status.positive, THEME.ui.panel, 0.56),
      intensity: 0.72
    };
  }
  return {
    glass: THEME.status.information,
    accent: THEME.status.positive,
    foliage: mixColor(THEME.status.positive, THEME.ui.accent, 0.22),
    intensity: 1
  };
};

const basePalette = (glass: number, warmth = 0): PrismPalette => {
  const base = warmth > 0
    ? mixColor(THEME.building.neutralTint, THEME.building.warmTint, warmth)
    : THEME.building.coolTint;
  const light = mixColor(base, THEME.ui.textPrimary, 0.18);
  return {
    top: mixColor(light, THEME.ui.accentBright, 0.05),
    left: mixColor(light, THEME.ui.panel, 0.12),
    right: mixColor(light, THEME.ui.panel, 0.24),
    edge: mixColor(THEME.ui.borderStrong, THEME.ui.panel, 0.12),
    glass
  };
};

const drawPublicDistrict = (
  context: CanvasRenderingContext2D,
  assetId: string
): void => {
  const status = statusPalette(assetId);
  const palette = basePalette(status.glass);
  context.globalAlpha = status.intensity;
  drawContactShadow(context, 320, 324, 205, 44);
  drawRoadRibbon(context, [[180, 300], [305, 245], [430, 285], [500, 326]]);

  drawIsoPrism(context, { centerX: 226, baseY: 245, width: 118, depth: 58, height: 72 }, palette, 2);
  drawSolarRoof(context, 226, 174, 72, 28, status.glass);
  drawIsoPrism(context, { centerX: 278, baseY: 221, width: 34, depth: 26, height: 106 }, {
    ...palette,
    glass: mixColor(status.glass, THEME.ui.accentBright, 0.14)
  }, 3);

  drawIsoPrism(context, { centerX: 405, baseY: 232, width: 146, depth: 66, height: 64 }, palette, 2);
  drawSolarRoof(context, 405, 167, 96, 34, status.glass);
  context.fillStyle = cssColor(status.accent, 0.88);
  context.fillRect(396, 187, 18, 5);
  context.fillRect(402.5, 180.5, 5, 18);

  drawIsoPrism(context, { centerX: 270, baseY: 327, width: 158, depth: 76, height: 78 }, palette, 3);
  drawIsoPrism(context, { centerX: 270, baseY: 281, width: 70, depth: 42, height: 44 }, palette, 1);
  context.beginPath();
  context.ellipse(270, 224, 34, 14, 0, Math.PI, Math.PI * 2);
  context.fillStyle = cssColor(mixColor(status.glass, THEME.ui.textPrimary, 0.16), 0.9);
  context.fill();
  context.strokeStyle = cssColor(palette.edge, 0.45);
  context.lineWidth = 1.2;
  context.stroke();

  drawIsoPrism(context, { centerX: 450, baseY: 310, width: 102, depth: 50, height: 42 }, palette, 1);
  polygon(context, [[444, 315], [526, 352], [454, 386], [372, 349]],
    cssColor(mixColor(THEME.building.publicFootprint, THEME.ui.panel, 0.08), 0.22),
    cssColor(THEME.ui.border, 0.18));
  context.beginPath();
  context.ellipse(452, 347, 32, 14, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(THEME.ui.panelRaised, 0.52);
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
  context.strokeStyle = cssColor(THEME.ocean.foam, 0.7);
  context.lineWidth = 2;
  context.stroke();

  for (const [x, y, scale] of [
    [154, 311, 0.9], [190, 348, 0.76], [354, 363, 0.72],
    [514, 332, 0.8], [498, 381, 0.64], [321, 196, 0.6]
  ] as const) drawTree(context, x, y, scale, status.foliage);
  for (const [x, y] of [[171, 278], [337, 333], [535, 311]] as const) {
    drawBeacon(context, x, y, status.accent);
  }
};

const drawIndustrialDistrict = (
  context: CanvasRenderingContext2D,
  assetId: string
): void => {
  const status = statusPalette(assetId);
  const palette = basePalette(status.glass);
  const steelPalette: PrismPalette = {
    ...palette,
    top: mixColor(palette.top, THEME.ui.panelSoft, 0.12),
    left: mixColor(palette.left, THEME.ui.panel, 0.12),
    right: mixColor(palette.right, THEME.ui.panel, 0.18)
  };
  context.globalAlpha = status.intensity;
  drawContactShadow(context, 326, 326, 214, 46);
  drawRoadRibbon(context, [[142, 332], [254, 290], [360, 312], [515, 344]]);

  // Clean production hall and logistics warehouse.
  drawIsoPrism(context, { centerX: 250, baseY: 318, width: 190, depth: 82, height: 66 }, steelPalette, 2);
  drawSolarRoof(context, 250, 252, 130, 42, status.glass);
  drawIsoPrism(context, { centerX: 426, baseY: 302, width: 142, depth: 70, height: 54 }, palette, 2);
  drawSolarRoof(context, 426, 248, 92, 34, status.glass);

  // Operations tower and compact electrical control block.
  drawIsoPrism(context, { centerX: 342, baseY: 246, width: 54, depth: 36, height: 108 }, {
    ...palette,
    glass: mixColor(status.glass, THEME.ui.accentBright, 0.14)
  }, 4);
  drawIsoPrism(context, { centerX: 500, baseY: 345, width: 82, depth: 46, height: 36 }, palette, 1);

  // Storage vessels replace the old smoke-heavy industrial silhouette.
  const tankBody = mixColor(THEME.building.neutralTint, THEME.ui.panelSoft, 0.12);
  const tankTop = mixColor(THEME.building.coolTint, THEME.ui.textPrimary, 0.12);
  drawCylinder(context, 150, 315, 24, 9, 54, tankBody, tankTop, palette.edge);
  drawCylinder(context, 192, 330, 20, 8, 43, tankBody, tankTop, palette.edge);

  // Piping and power-routing accents.
  context.strokeStyle = cssColor(status.accent, 0.52);
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(151, 280);
  context.lineTo(205, 260);
  context.lineTo(250, 274);
  context.stroke();
  context.strokeStyle = cssColor(THEME.ui.borderStrong, 0.52);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(454, 326);
  context.lineTo(500, 342);
  context.stroke();

  for (const [x, y, scale] of [
    [123, 349, 0.62], [542, 361, 0.68], [459, 226, 0.5]
  ] as const) drawTree(context, x, y, scale, status.foliage);
  for (const [x, y] of [[117, 291], [392, 344], [548, 326]] as const) {
    drawBeacon(context, x, y, status.accent);
  }
};

const drawOldTownDistrict = (
  context: CanvasRenderingContext2D,
  assetId: string
): void => {
  const status = statusPalette(assetId);
  const warmPalette = basePalette(status.glass, 0.72);
  const roof = mixColor(THEME.status.warning, THEME.building.oldTownFootprint, 0.46);
  context.globalAlpha = status.intensity;
  drawContactShadow(context, 318, 331, 210, 45);
  drawRoadRibbon(context, [[136, 336], [258, 292], [371, 323], [520, 352]]);

  const houses = [
    { x: 190, y: 306, w: 92, d: 54, h: 54 },
    { x: 292, y: 270, w: 104, d: 58, h: 68 },
    { x: 405, y: 298, w: 98, d: 56, h: 60 },
    { x: 490, y: 342, w: 76, d: 46, h: 45 },
    { x: 248, y: 356, w: 82, d: 48, h: 44 }
  ] as const;
  for (const house of houses) {
    drawIsoPrism(context, {
      centerX: house.x,
      baseY: house.y,
      width: house.w,
      depth: house.d,
      height: house.h
    }, warmPalette, house.h > 58 ? 2 : 1);
    polygon(context, [
      [house.x, house.y - house.h - house.d * 0.72],
      [house.x + house.w * 0.52, house.y - house.h],
      [house.x, house.y - house.h + house.d * 0.42],
      [house.x - house.w * 0.52, house.y - house.h]
    ], cssColor(roof, 0.94), cssColor(warmPalette.edge, 0.48), 1);
  }

  // A small civic square modernises the heritage district without erasing its
  // low-rise identity or covering it with one baked rectangular platform.
  polygon(context, [[362, 326], [440, 362], [376, 391], [298, 356]],
    cssColor(mixColor(THEME.building.oldTownFootprint, THEME.ui.panelRaised, 0.18), 0.2),
    cssColor(THEME.ui.border, 0.16));
  context.beginPath();
  context.ellipse(371, 357, 17, 8, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(status.glass, 0.38);
  context.fill();
  context.strokeStyle = cssColor(status.accent, 0.58);
  context.lineWidth = 2;
  context.stroke();

  for (const [x, y, scale] of [
    [135, 343, 0.8], [330, 389, 0.68], [454, 375, 0.76],
    [530, 358, 0.7], [355, 250, 0.54]
  ] as const) drawTree(context, x, y, scale, status.foliage);
  for (const [x, y] of [[156, 316], [348, 343], [522, 333]] as const) {
    drawBeacon(context, x, y, status.accent);
  }
};

export const city01GeneratedDistrictKind = (
  assetId: string
): City01GeneratedDistrictKind | undefined => {
  if (assetId.startsWith('commercial_district_public_')) return 'public';
  if (assetId.startsWith('commercial_district_industrial_')) return 'industrial';
  if (assetId.startsWith('commercial_district_old_town_')) return 'old-town';
  return undefined;
};

export const createCity01DistrictV2Texture = (
  assetId: string
): Texture | undefined => {
  if (typeof document === 'undefined') return undefined;
  const kind = city01GeneratedDistrictKind(assetId);
  if (!kind) return undefined;
  const canvas = makeCanvas(640, 420);
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  if (kind === 'public') drawPublicDistrict(context, assetId);
  if (kind === 'industrial') drawIndustrialDistrict(context, assetId);
  if (kind === 'old-town') drawOldTownDistrict(context, assetId);
  return textureFromCanvas(canvas);
};

export const CITY01_DISTRICT_V2_CONTRACT = {
  canvasWidth: 640,
  canvasHeight: 420,
  generatedKinds: ['public', 'industrial', 'old-town'],
  camera: 'isometric-2-to-1',
  lightSource: CITY01_ART_V2.direction.lightSource,
  hardRectangularBase: false,
  textualSignage: false,
  sharedTileWorldGrounding: true
} as const;
