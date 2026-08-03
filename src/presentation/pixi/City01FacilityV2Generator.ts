import { CanvasSource, Texture } from 'pixi.js';

export type City01FacilityV2Kind =
  | 'solar'
  | 'wind'
  | 'gas'
  | 'battery'
  | 'battery_utility'
  | 'substation';

export type City01FacilityV2State =
  | 'active'
  | 'construction'
  | 'offline'
  | 'fault';

export interface City01FacilityV2Asset {
  kind: City01FacilityV2Kind;
  state: City01FacilityV2State;
}

interface StateStyle {
  body: number;
  bodyDark: number;
  bodyLight: number;
  roof: number;
  glass: number;
  accent: number;
  warning: number;
  alpha: number;
}

const CANVAS_SIZE = 512;
const BASELINE = 467;

const channel = (color: number, shift: number): number => (color >> shift) & 0xff;
const css = (color: number, alpha = 1): string =>
  `rgba(${channel(color, 16)}, ${channel(color, 8)}, ${channel(color, 0)}, ${alpha})`;

const mix = (from: number, to: number, amount: number): number => {
  const value = (shift: number): number => Math.max(0, Math.min(255, Math.round(
    channel(from, shift) + (channel(to, shift) - channel(from, shift)) * amount
  )));
  return (value(16) << 16) | (value(8) << 8) | value(0);
};

const parseState = (value: string): City01FacilityV2State | undefined => {
  if (value === 'active' || value === 'construction' || value === 'offline' || value === 'fault') {
    return value;
  }
  return undefined;
};

export const city01FacilityV2Asset = (
  assetId: string
): City01FacilityV2Asset | undefined => {
  const match = /^commercial_facility_(battery_utility|solar|wind|gas|battery|substation)_(active|construction|offline|fault)$/.exec(assetId);
  if (!match) return undefined;
  const kind = match[1] as City01FacilityV2Kind | undefined;
  const state = parseState(match[2] ?? '');
  return kind && state ? { kind, state } : undefined;
};

export const isCity01FacilityV2Asset = (assetId: string): boolean =>
  Boolean(city01FacilityV2Asset(assetId));

const makeCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
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

const line = (
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  color: number,
  width: number,
  alpha = 1
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) context.lineTo(point[0], point[1]);
  context.strokeStyle = css(color, alpha);
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
};

const styleForState = (state: City01FacilityV2State): StateStyle => {
  const base: StateStyle = {
    body: 0xcbd6d3,
    bodyDark: 0x80918f,
    bodyLight: 0xe8efec,
    roof: 0xaebdb9,
    glass: 0x4d9db4,
    accent: 0x42d5ac,
    warning: 0xff6b5f,
    alpha: 1
  };
  if (state === 'offline') {
    return {
      ...base,
      body: 0x8c9695,
      bodyDark: 0x5e6969,
      bodyLight: 0xaeb6b4,
      roof: 0x747e7d,
      glass: 0x45575b,
      accent: 0x647574,
      alpha: 0.82
    };
  }
  if (state === 'fault') {
    return {
      ...base,
      body: 0xb8c1bf,
      bodyDark: 0x6f7a79,
      bodyLight: 0xd4dbd8,
      roof: 0x929c9a,
      glass: 0x596d71,
      accent: 0xff6b5f,
      alpha: 0.92
    };
  }
  if (state === 'construction') {
    return {
      ...base,
      body: 0xb9b8ab,
      bodyDark: 0x77776e,
      bodyLight: 0xd7d3bf,
      roof: 0x99988b,
      glass: 0x6d7778,
      accent: 0xf5c75b,
      alpha: 0.9
    };
  }
  return base;
};

const drawContactShadow = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): void => {
  context.save();
  context.filter = 'blur(9px)';
  context.beginPath();
  context.ellipse(centerX + 10, centerY + 7, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(7, 18, 18, .18)';
  context.fill();
  context.restore();
};

const drawIsoPrism = (
  context: CanvasRenderingContext2D,
  centerX: number,
  baseY: number,
  width: number,
  depth: number,
  height: number,
  style: StateStyle,
  windowRows = 0
): void => {
  const top = [centerX, baseY - height - depth * 0.5] as const;
  const left = [centerX - width * 0.5, baseY - height] as const;
  const right = [centerX + width * 0.5, baseY - height] as const;
  const back = [centerX, baseY - height + depth * 0.5] as const;
  const groundLeft = [centerX - width * 0.5, baseY] as const;
  const groundRight = [centerX + width * 0.5, baseY] as const;
  const groundBack = [centerX, baseY + depth * 0.5] as const;

  polygon(context, [left, back, groundBack, groundLeft], css(style.body), css(style.bodyDark, 0.72), 1.2);
  polygon(context, [right, back, groundBack, groundRight], css(style.bodyDark), css(style.bodyDark, 0.76), 1.2);
  polygon(context, [top, right, back, left], css(style.bodyLight), css(style.bodyDark, 0.72), 1.2);

  for (let row = 0; row < windowRows; row += 1) {
    const y = baseY - height + 14 + row * 19;
    for (let index = 0; index < 3; index += 1) {
      const ratio = (index + 1) / 4;
      polygon(context, [
        [centerX - width * 0.46 + width * 0.38 * ratio, y],
        [centerX - width * 0.46 + width * 0.38 * ratio + 10, y + 5],
        [centerX - width * 0.46 + width * 0.38 * ratio + 10, y + 14],
        [centerX - width * 0.46 + width * 0.38 * ratio, y + 9]
      ], css(style.glass, stateWindowAlpha(style)));
      polygon(context, [
        [centerX + width * 0.08 + width * 0.35 * ratio, y + 5],
        [centerX + width * 0.08 + width * 0.35 * ratio + 10, y],
        [centerX + width * 0.08 + width * 0.35 * ratio + 10, y + 9],
        [centerX + width * 0.08 + width * 0.35 * ratio, y + 14]
      ], css(style.glass, stateWindowAlpha(style)));
    }
  }
};

const stateWindowAlpha = (style: StateStyle): number => style.accent === 0x647574 ? 0.28 : 0.78;

const drawPanel = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
  style: StateStyle
): void => {
  const panel = mix(style.glass, 0x0c3146, 0.38);
  polygon(context, [
    [centerX, centerY - depth * 0.5],
    [centerX + width * 0.5, centerY],
    [centerX, centerY + depth * 0.5],
    [centerX - width * 0.5, centerY]
  ], css(panel, style.alpha), css(style.bodyLight, 0.6), 1);
  line(context, [[centerX - width * 0.25, centerY - depth * 0.25], [centerX + width * 0.25, centerY + depth * 0.25]], style.bodyLight, 0.8, 0.45);
  line(context, [[centerX + width * 0.25, centerY - depth * 0.25], [centerX - width * 0.25, centerY + depth * 0.25]], style.bodyLight, 0.8, 0.38);
};

const drawBeacon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: StateStyle
): void => {
  context.save();
  context.shadowColor = css(style.accent, 0.72);
  context.shadowBlur = style.accent === 0x647574 ? 0 : 9;
  context.beginPath();
  context.arc(x, y, 4, 0, Math.PI * 2);
  context.fillStyle = css(style.accent, 0.92);
  context.fill();
  context.restore();
};

const drawFaultMarks = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  x: number,
  y: number
): void => {
  if (state !== 'fault') return;
  line(context, [[x - 18, y], [x - 5, y - 12], [x + 4, y + 2], [x + 20, y - 16]], 0xff785f, 3, 0.92);
  context.beginPath();
  context.arc(x + 22, y - 18, 5, 0, Math.PI * 2);
  context.fillStyle = css(0xffc35f, 0.9);
  context.fill();
};

const drawConstruction = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  if (state !== 'construction') return;
  const yellow = 0xf5c75b;
  const steel = 0x6f7776;
  for (const offset of [-width * 0.5, width * 0.5]) {
    line(context, [[x + offset, y], [x + offset, y - height]], steel, 3, 0.82);
  }
  for (let row = 0; row <= 3; row += 1) {
    const yy = y - height * row / 3;
    line(context, [[x - width * 0.5, yy], [x + width * 0.5, yy]], yellow, 2.2, 0.9);
  }
  line(context, [[x - width * 0.5, y], [x + width * 0.5, y - height]], steel, 1.7, 0.72);
  line(context, [[x + width * 0.5, y], [x - width * 0.5, y - height]], steel, 1.7, 0.72);
};

const drawSolar = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  style: StateStyle
): void => {
  drawContactShadow(context, 258, 438, 188, 35);
  const completeRows = state === 'construction' ? 1 : 2;
  for (let row = 0; row < completeRows; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const x = 152 + column * 104 + row * 28;
      const y = 346 + row * 54;
      line(context, [[x, y + 28], [x, y + 43]], style.bodyDark, 4, 0.85);
      drawPanel(context, x, y, 92, 42, style);
    }
  }
  drawIsoPrism(context, 404, 425, 74, 44, 76, style, 1);
  drawBeacon(context, 424, 372, style);
  drawConstruction(context, state, 255, 404, 205, 94);
  drawFaultMarks(context, state, 342, 328);
};

const drawWindTurbine = (
  context: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  scale: number,
  style: StateStyle,
  state: City01FacilityV2State,
  complete: boolean
): void => {
  const hubY = baseY - 172 * scale;
  if (!complete) {
    polygon(context, [[x, baseY - 12], [x + 22 * scale, baseY], [x, baseY + 12], [x - 22 * scale, baseY]], css(style.bodyDark, 0.8));
    line(context, [[x, baseY - 4], [x, baseY - 70 * scale]], style.bodyDark, 7 * scale, 0.82);
    return;
  }
  polygon(context, [
    [x - 8 * scale, baseY], [x + 8 * scale, baseY],
    [x + 4 * scale, hubY], [x - 4 * scale, hubY]
  ], css(style.bodyLight), css(style.bodyDark, 0.68), 1);
  context.beginPath();
  context.arc(x, hubY, 10 * scale, 0, Math.PI * 2);
  context.fillStyle = css(style.accent, style.alpha);
  context.fill();
  for (const angle of [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]) {
    const endX = x + Math.cos(angle) * 70 * scale;
    const endY = hubY + Math.sin(angle) * 70 * scale;
    line(context, [[x, hubY], [endX, endY]], style.bodyLight, 7 * scale, style.alpha);
    line(context, [[x, hubY], [endX, endY]], style.bodyDark, 1.2 * scale, 0.72);
  }
  if (state === 'fault') {
    line(context, [[x - 22 * scale, hubY - 22 * scale], [x + 18 * scale, hubY + 18 * scale]], style.warning, 4, 0.92);
  }
};

const drawWind = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  style: StateStyle
): void => {
  drawContactShadow(context, 256, 441, 154, 30);
  drawWindTurbine(context, 256, 440, 1.16, style, state, true);
  drawWindTurbine(context, 148, 432, 0.78, style, state, state !== 'construction');
  drawWindTurbine(context, 374, 435, 0.84, style, state, state !== 'construction');
  drawConstruction(context, state, 372, 425, 70, 100);
  drawFaultMarks(context, state, 292, 235);
};

const drawCylinder = (
  context: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  radiusX: number,
  radiusY: number,
  height: number,
  style: StateStyle
): void => {
  context.fillStyle = css(style.bodyDark, style.alpha);
  context.fillRect(x - radiusX, baseY - height, radiusX * 2, height);
  context.beginPath();
  context.ellipse(x, baseY - height, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fillStyle = css(style.bodyLight, style.alpha);
  context.fill();
  context.strokeStyle = css(style.bodyDark, 0.7);
  context.stroke();
};

const drawGas = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  style: StateStyle
): void => {
  drawContactShadow(context, 260, 438, 194, 36);
  drawIsoPrism(context, 254, 421, 210, 92, 104, style, 3);
  drawIsoPrism(context, 398, 432, 94, 50, 68, style, 2);
  drawCylinder(context, 144, 420, 25, 10, 80, style);
  drawCylinder(context, 185, 428, 21, 8, state === 'construction' ? 38 : 64, style);
  line(context, [[143, 342], [198, 320], [250, 344]], style.accent, 4, 0.72);
  line(context, [[356, 406], [421, 430]], style.bodyDark, 5, 0.7);
  drawBeacon(context, 356, 330, style);
  drawConstruction(context, state, 259, 410, 220, 130);
  drawFaultMarks(context, state, 182, 336);
};

const drawBatteryModule = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  style: StateStyle,
  state: City01FacilityV2State
): void => {
  drawIsoPrism(context, x, y, width, 52, 78, style, 2);
  for (let index = 0; index < 3; index += 1) {
    const barHeight = state === 'offline' ? 6 : 10 + index * 6;
    context.fillStyle = css(style.accent, state === 'offline' ? 0.26 : 0.74);
    context.fillRect(x - 21 + index * 15, y - 60 - barHeight, 7, barHeight);
  }
};

const drawBattery = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  style: StateStyle
): void => {
  drawContactShadow(context, 256, 441, 178, 34);
  drawBatteryModule(context, 180, 413, 112, style, state);
  drawBatteryModule(context, 306, 438, 112, style, state);
  if (state !== 'construction') drawBatteryModule(context, 347, 351, 104, style, state);
  drawIsoPrism(context, 116, 440, 58, 38, 60, style, 1);
  line(context, [[144, 411], [168, 401]], style.accent, 3, 0.66);
  drawConstruction(context, state, 344, 386, 116, 100);
  drawFaultMarks(context, state, 310, 334);
};

const drawBatteryUtility = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  style: StateStyle
): void => {
  drawContactShadow(context, 258, 442, 214, 38);
  const modules = [
    [137, 382], [244, 405], [351, 428],
    [190, 326], [297, 349], [404, 372]
  ] as const;
  for (const [index, module] of modules.entries()) {
    if (state === 'construction' && index > 2) continue;
    drawBatteryModule(context, module[0], module[1], 94, style, state);
  }
  drawIsoPrism(context, 92, 438, 56, 36, 70, style, 1);
  line(context, [[112, 398], [160, 376], [204, 390]], style.accent, 3.5, 0.7);
  drawConstruction(context, state, 302, 386, 238, 126);
  drawFaultMarks(context, state, 399, 316);
};

const drawSubstation = (
  context: CanvasRenderingContext2D,
  state: City01FacilityV2State,
  style: StateStyle
): void => {
  drawContactShadow(context, 256, 442, 202, 37);
  drawIsoPrism(context, 190, 420, 112, 64, 82, style, 2);
  drawIsoPrism(context, 333, 430, 126, 70, state === 'construction' ? 52 : 92, style, 2);
  for (const x of [114, 159, 390, 435]) {
    line(context, [[x, 424], [x, 314]], style.bodyDark, 5, 0.82);
    line(context, [[x - 18, 338], [x + 18, 338]], style.bodyDark, 4, 0.82);
    context.beginPath();
    context.arc(x - 12, 338, 4, 0, Math.PI * 2);
    context.arc(x + 12, 338, 4, 0, Math.PI * 2);
    context.fillStyle = css(style.glass, 0.88);
    context.fill();
  }
  line(context, [[114, 314], [159, 314], [390, 314], [435, 314]], style.accent, 3, state === 'offline' ? 0.2 : 0.68);
  drawBeacon(context, 254, 322, style);
  drawConstruction(context, state, 332, 416, 132, 122);
  drawFaultMarks(context, state, 405, 312);
};

export const createCity01FacilityV2Texture = (
  assetId: string
): Texture | undefined => {
  if (typeof document === 'undefined') return undefined;
  const asset = city01FacilityV2Asset(assetId);
  if (!asset) return undefined;
  const canvas = makeCanvas();
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const style = styleForState(asset.state);
  context.globalAlpha = style.alpha;

  if (asset.kind === 'solar') drawSolar(context, asset.state, style);
  if (asset.kind === 'wind') drawWind(context, asset.state, style);
  if (asset.kind === 'gas') drawGas(context, asset.state, style);
  if (asset.kind === 'battery') drawBattery(context, asset.state, style);
  if (asset.kind === 'battery_utility') drawBatteryUtility(context, asset.state, style);
  if (asset.kind === 'substation') drawSubstation(context, asset.state, style);

  return textureFromCanvas(canvas);
};

export const CITY01_FACILITY_V2_CONTRACT = {
  canvasWidth: CANVAS_SIZE,
  canvasHeight: CANVAS_SIZE,
  anchorY: 0.9115,
  baseline: BASELINE,
  generatedKinds: [
    'solar',
    'wind',
    'gas',
    'battery',
    'battery_utility',
    'substation'
  ],
  states: ['active', 'construction', 'offline', 'fault'],
  hardRectangularBase: false,
  bakedText: false,
  stateSpecificGeometry: true
} as const;
