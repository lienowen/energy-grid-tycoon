import { CanvasSource, Texture } from 'pixi.js';
import { CITY01_ART_V2 } from '../art-v2/City01ArtV2Theme';

export type City01ExpandedDistrictKind = 'residential' | 'commercial';

const THEME = CITY01_ART_V2.palette;

const channel = (color: number, shift: number): number => (color >> shift) & 0xff;
const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const mixColor = (from: number, to: number, amount: number): number => {
  const mix = (shift: number): number => clampByte(
    channel(from, shift) + (channel(to, shift) - channel(from, shift)) * amount
  );
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
};
const cssColor = (color: number, alpha = 1): string =>
  `rgba(${channel(color, 16)}, ${channel(color, 8)}, ${channel(color, 0)}, ${alpha})`;

const makeCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
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

interface BuildingPalette {
  top: number;
  left: number;
  right: number;
  edge: number;
  glass: number;
}

const palette = (glass: number, warmth: number): BuildingPalette => {
  const body = mixColor(THEME.building.neutralTint, THEME.building.warmTint, warmth);
  const light = mixColor(body, THEME.ui.textPrimary, 0.2);
  return {
    top: mixColor(light, THEME.ui.textPrimary, 0.08),
    left: mixColor(light, THEME.ui.panel, 0.11),
    right: mixColor(light, THEME.ui.panel, 0.25),
    edge: mixColor(THEME.ui.borderStrong, THEME.ui.panel, 0.14),
    glass
  };
};

const drawPrism = (
  context: CanvasRenderingContext2D,
  centerX: number,
  baseY: number,
  width: number,
  depth: number,
  height: number,
  colors: BuildingPalette,
  windowRows: number
): void => {
  const top = [centerX, baseY - depth * 0.5 - height] as const;
  const right = [centerX + width * 0.5, baseY - height] as const;
  const bottom = [centerX, baseY + depth * 0.5 - height] as const;
  const left = [centerX - width * 0.5, baseY - height] as const;
  const groundRight = [centerX + width * 0.5, baseY] as const;
  const groundBottom = [centerX, baseY + depth * 0.5] as const;
  const groundLeft = [centerX - width * 0.5, baseY] as const;

  polygon(context, [left, bottom, groundBottom, groundLeft], cssColor(colors.left), cssColor(colors.edge, 0.52), 1.1);
  polygon(context, [right, bottom, groundBottom, groundRight], cssColor(colors.right), cssColor(colors.edge, 0.52), 1.1);
  polygon(context, [top, right, bottom, left], cssColor(colors.top), cssColor(colors.edge, 0.6), 1.1);

  const columns = width > 110 ? 4 : 3;
  for (let row = 0; row < windowRows; row += 1) {
    const y = baseY - height + 15 + row * 19;
    if (y > baseY - 12) continue;
    for (let index = 0; index < columns; index += 1) {
      const ratio = (index + 1) / (columns + 1);
      const leftX = centerX - width * 0.43 + width * 0.34 * ratio;
      polygon(context, [
        [leftX - 5, y],
        [leftX + 6, y + 6],
        [leftX + 6, y + 15],
        [leftX - 5, y + 9]
      ], cssColor(colors.glass, 0.68));
      const rightX = centerX + width * 0.08 + width * 0.33 * ratio;
      polygon(context, [
        [rightX - 5, y + 6],
        [rightX + 6, y],
        [rightX + 6, y + 9],
        [rightX - 5, y + 15]
      ], cssColor(colors.glass, 0.68));
    }
  }
};

const drawShadow = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number
): void => {
  context.save();
  context.filter = 'blur(8px)';
  context.beginPath();
  context.ellipse(x + 8, y + 7, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(3, 14, 15, .2)';
  context.fill();
  context.restore();
};

const drawRoad = (
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
  context.strokeStyle = cssColor(THEME.road.shoulder, 0.42);
  context.lineWidth = 11;
  context.stroke();
  context.strokeStyle = cssColor(THEME.road.asphalt, 0.68);
  context.lineWidth = 6;
  context.stroke();
};

const drawTree = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  foliage: number
): void => {
  context.fillStyle = cssColor(mixColor(foliage, THEME.ui.panel, 0.48));
  context.fillRect(x - 1.6 * scale, y - 11 * scale, 3.2 * scale, 13 * scale);
  context.beginPath();
  context.arc(x, y - 15 * scale, 8.5 * scale, 0, Math.PI * 2);
  context.arc(x - 5 * scale, y - 12 * scale, 5.5 * scale, 0, Math.PI * 2);
  context.arc(x + 5 * scale, y - 12 * scale, 5.5 * scale, 0, Math.PI * 2);
  context.fillStyle = cssColor(foliage, 0.92);
  context.fill();
};

const drawSolarRoof = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  depth: number,
  glass: number
): void => {
  polygon(context, [
    [x, y - depth * 0.5],
    [x + width * 0.5, y],
    [x, y + depth * 0.5],
    [x - width * 0.5, y]
  ], cssColor(glass, 0.86), cssColor(THEME.ui.textPrimary, 0.32), 0.9);
  context.strokeStyle = cssColor(THEME.ui.textPrimary, 0.22);
  context.lineWidth = 0.7;
  for (const offset of [-0.25, 0, 0.25]) {
    context.beginPath();
    context.moveTo(x - width * 0.5 * (1 - Math.abs(offset)), y + depth * offset);
    context.lineTo(x + width * 0.5 * (1 - Math.abs(offset)), y + depth * offset);
    context.stroke();
  }
};

const status = (assetId: string): {
  glass: number;
  accent: number;
  foliage: number;
  intensity: number;
} => assetId.endsWith('_blackout')
  ? {
      glass: THEME.status.muted,
      accent: THEME.status.danger,
      foliage: mixColor(THEME.status.positive, THEME.ui.panel, 0.6),
      intensity: 0.7
    }
  : {
      glass: THEME.status.information,
      accent: THEME.status.positive,
      foliage: mixColor(THEME.status.positive, THEME.ui.accent, 0.2),
      intensity: 1
    };

const drawResidentialDistrict = (
  context: CanvasRenderingContext2D,
  assetId: string
): void => {
  const state = status(assetId);
  const apartment = palette(state.glass, 0.22);
  const townhouse = palette(state.glass, 0.52);
  context.globalAlpha = state.intensity;
  drawShadow(context, 318, 330, 208, 44);
  drawRoad(context, [[128, 334], [238, 292], [352, 315], [522, 350]]);
  drawRoad(context, [[298, 236], [318, 329]]);

  drawPrism(context, 210, 292, 116, 60, 96, apartment, 4);
  drawPrism(context, 338, 250, 102, 54, 118, apartment, 5);
  drawPrism(context, 455, 300, 112, 58, 82, apartment, 3);
  drawSolarRoof(context, 210, 195, 72, 28, state.glass);
  drawSolarRoof(context, 455, 217, 66, 26, state.glass);

  for (const house of [
    { x: 170, y: 354, w: 66, d: 40, h: 36 },
    { x: 255, y: 370, w: 70, d: 42, h: 40 },
    { x: 386, y: 365, w: 70, d: 42, h: 38 },
    { x: 492, y: 367, w: 64, d: 38, h: 34 }
  ] as const) {
    drawPrism(context, house.x, house.y, house.w, house.d, house.h, townhouse, 1);
  }

  drawPrism(context, 300, 345, 84, 46, 42, townhouse, 1);
  polygon(context, [[291, 350], [350, 377], [302, 399], [242, 372]],
    cssColor(mixColor(THEME.building.residentialFootprint, THEME.ui.panel, 0.08), 0.2),
    cssColor(THEME.ui.borderStrong, 0.16));
  context.beginPath();
  context.ellipse(298, 374, 19, 8, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(state.accent, 0.32);
  context.fill();

  for (const [x, y, scale] of [
    [122, 347, 0.78], [151, 286, 0.64], [289, 402, 0.68],
    [420, 397, 0.7], [536, 358, 0.78], [392, 246, 0.55]
  ] as const) drawTree(context, x, y, scale, state.foliage);
};

const drawCommercialDistrict = (
  context: CanvasRenderingContext2D,
  assetId: string
): void => {
  const state = status(assetId);
  const tower = palette(mixColor(state.glass, THEME.ui.textPrimary, 0.1), 0.08);
  const podium = palette(state.glass, 0.3);
  context.globalAlpha = state.intensity;
  drawShadow(context, 322, 329, 210, 46);
  drawRoad(context, [[126, 342], [246, 296], [362, 318], [524, 348]]);
  drawRoad(context, [[318, 213], [322, 330]]);

  drawPrism(context, 292, 270, 86, 48, 154, tower, 7);
  drawPrism(context, 405, 286, 112, 56, 126, tower, 5);
  drawPrism(context, 205, 306, 124, 62, 88, tower, 3);
  drawPrism(context, 500, 344, 92, 48, 58, podium, 2);
  drawPrism(context, 316, 354, 164, 74, 50, podium, 2);

  drawSolarRoof(context, 316, 303, 108, 34, state.glass);
  context.fillStyle = cssColor(state.accent, 0.72);
  context.fillRect(495, 285, 10, 4);
  context.fillRect(498, 282, 4, 10);

  polygon(context, [[360, 340], [474, 391], [382, 412], [268, 362]],
    cssColor(mixColor(THEME.building.commercialFootprint, THEME.ui.panel, 0.08), 0.22),
    cssColor(THEME.ui.borderStrong, 0.18));
  context.beginPath();
  context.ellipse(375, 374, 27, 12, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(state.glass, 0.34);
  context.fill();
  context.strokeStyle = cssColor(state.accent, 0.5);
  context.lineWidth = 2;
  context.stroke();

  for (const [x, y, scale] of [
    [128, 350, 0.68], [170, 376, 0.62], [270, 402, 0.58],
    [445, 406, 0.62], [548, 360, 0.72]
  ] as const) drawTree(context, x, y, scale, state.foliage);
};

export const expandedCity01DistrictKind = (
  assetId: string
): City01ExpandedDistrictKind | undefined => {
  if (assetId.startsWith('commercial_district_residential_')) return 'residential';
  if (assetId.startsWith('commercial_district_commercial_')) return 'commercial';
  return undefined;
};

export const createExpandedCity01DistrictTexture = (
  assetId: string
): Texture | undefined => {
  if (typeof document === 'undefined') return undefined;
  const kind = expandedCity01DistrictKind(assetId);
  if (!kind) return undefined;
  const canvas = makeCanvas();
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  if (kind === 'residential') drawResidentialDistrict(context, assetId);
  if (kind === 'commercial') drawCommercialDistrict(context, assetId);
  return textureFromCanvas(canvas);
};

export const CITY01_DISTRICT_V2_EXPANSION_CONTRACT = {
  canvasWidth: 640,
  canvasHeight: 420,
  generatedKinds: ['residential', 'commercial'],
  modularBuildings: true,
  hardRectangularBase: false,
  textualSignage: false,
  sharedWorldV2Roads: true
} as const;
