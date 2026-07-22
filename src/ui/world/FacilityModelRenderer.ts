import type { FacilitySceneState } from '../../presentation/CitySceneTypes';
import type { ScreenPoint } from './HologramGeometry';
import { clamp01, drawIsoBox, rgba, type Rgb } from './HologramDrawing';

export type FacilityModelKind =
  | 'solar'
  | 'wind'
  | 'gas'
  | 'battery'
  | 'batteryCampus'
  | 'offshoreWind'
  | 'nuclear'
  | 'generic';

export const resolveFacilityModelKind = (configId: string): FacilityModelKind => {
  if (configId.includes('offshore')) return 'offshoreWind';
  if (configId.includes('nuclear')) return 'nuclear';
  if (configId.includes('solar')) return 'solar';
  if (configId.includes('wind')) return 'wind';
  if (configId.includes('gas')) return 'gas';
  if (configId.includes('battery_utility')) return 'batteryCampus';
  if (configId.includes('battery')) return 'battery';
  return 'generic';
};

export interface FacilityModelRenderInput {
  context: CanvasRenderingContext2D;
  facility: FacilitySceneState;
  center: ScreenPoint;
  size: number;
  accent: Rgb;
  now: number;
  progress: number;
  zoom: number;
}

const color = {
  dark: '#061924',
  darker: '#031018',
  steel: '#8fa9b8',
  steelLight: '#d9edf5',
  cyan: '#4ad7ff',
  blue: '#1c6d95',
  green: '#5ce1a3',
  amber: '#ffca6b',
  orange: '#ff9b54',
  purple: '#b8a0ff',
  white: '#edf9ff'
};

const drawFoundation = (
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  size: number,
  accent: Rgb,
  progress: number
): void => {
  const width = size * 0.78;
  const depth = size * 0.3;
  drawIsoBox(
    context,
    center.x,
    center.y + size * 0.06,
    width,
    depth,
    Math.max(3, size * 0.06),
    rgba(accent, 0.22 + progress * 0.16),
    'rgba(3, 24, 34, .95)',
    'rgba(2, 18, 28, .98)',
    rgba(accent, 0.72)
  );
};

const drawScaffolding = (
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  size: number,
  progress: number,
  now: number
): void => {
  const height = size * (0.38 + progress * 0.28);
  const halfWidth = size * 0.28;
  const top = center.y - height;
  context.save();
  context.globalAlpha = 0.42 + Math.sin(now / 180) * 0.08;
  context.strokeStyle = 'rgba(126, 225, 255, .72)';
  context.lineWidth = Math.max(1, size * 0.012);
  for (const x of [center.x - halfWidth, center.x, center.x + halfWidth]) {
    context.beginPath();
    context.moveTo(x, center.y);
    context.lineTo(x, top);
    context.stroke();
  }
  for (let row = 0; row <= 4; row += 1) {
    const y = center.y - height * row / 4;
    context.beginPath();
    context.moveTo(center.x - halfWidth, y);
    context.lineTo(center.x + halfWidth, y);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(center.x - halfWidth, center.y);
  context.lineTo(center.x + halfWidth, top);
  context.moveTo(center.x + halfWidth, center.y);
  context.lineTo(center.x - halfWidth, top);
  context.stroke();
  context.restore();
};

const drawConstructionSparks = (
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  size: number,
  now: number
): void => {
  context.save();
  context.fillStyle = color.amber;
  context.shadowColor = color.orange;
  context.shadowBlur = 10;
  for (let index = 0; index < 5; index += 1) {
    const phase = (now / 420 + index * 0.19) % 1;
    const angle = index * 1.7 + now / 900;
    const radius = size * (0.08 + phase * 0.24);
    context.beginPath();
    context.arc(
      center.x + Math.cos(angle) * radius,
      center.y - size * 0.1 - Math.sin(angle) * radius * 0.5,
      Math.max(1, size * 0.012 * (1 - phase)),
      0,
      Math.PI * 2
    );
    context.fill();
  }
  context.restore();
};

const drawSolarPanel = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  depth: number,
  alpha: number
): void => {
  context.save();
  context.fillStyle = `rgba(16, 91, 137, ${alpha})`;
  context.strokeStyle = `rgba(91, 225, 255, ${alpha})`;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x - width / 2, y);
  context.lineTo(x, y - depth / 2);
  context.lineTo(x + width / 2, y);
  context.lineTo(x, y + depth / 2);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = `rgba(154, 233, 255, ${alpha * 0.55})`;
  context.beginPath();
  context.moveTo(x - width * 0.25, y - depth * 0.12);
  context.lineTo(x + width * 0.25, y + depth * 0.12);
  context.moveTo(x - width * 0.25, y + depth * 0.12);
  context.lineTo(x + width * 0.25, y - depth * 0.12);
  context.stroke();
  context.restore();
};

const drawSolarModel = (input: FacilityModelRenderInput, rise: number): void => {
  const { context, center, size, progress } = input;
  const baseY = center.y - rise;
  drawIsoBox(context, center.x, baseY, size * 0.54, size * 0.22, size * 0.12, '#20495e', '#0a2a3a', '#071f2e', color.cyan);
  const panelWidth = size * 0.28;
  const panelDepth = size * 0.13;
  const alpha = 0.68 + progress * 0.28;
  for (const row of [-1, 1]) {
    for (const column of [-1, 0, 1]) {
      drawSolarPanel(
        context,
        center.x + column * panelWidth * 0.68,
        baseY - size * 0.17 + row * panelDepth * 0.58,
        panelWidth,
        panelDepth,
        alpha
      );
    }
  }
  context.save();
  context.strokeStyle = 'rgba(207, 239, 248, .72)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(center.x - size * 0.18, baseY - size * 0.06);
  context.lineTo(center.x - size * 0.13, baseY - size * 0.18);
  context.moveTo(center.x + size * 0.18, baseY - size * 0.06);
  context.lineTo(center.x + size * 0.13, baseY - size * 0.18);
  context.stroke();
  context.restore();
};

const drawTurbine = (
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  height: number,
  now: number,
  alpha = 1
): void => {
  const hubY = groundY - height;
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color.steelLight;
  context.lineWidth = Math.max(2, height * 0.045);
  context.beginPath();
  context.moveTo(x, groundY);
  context.lineTo(x, hubY);
  context.stroke();
  context.fillStyle = color.cyan;
  context.shadowColor = color.cyan;
  context.shadowBlur = 10;
  context.beginPath();
  context.arc(x, hubY, Math.max(3, height * 0.07), 0, Math.PI * 2);
  context.fill();
  context.translate(x, hubY);
  context.rotate(now / 900);
  context.strokeStyle = color.white;
  context.lineWidth = Math.max(1.5, height * 0.035);
  for (let blade = 0; blade < 3; blade += 1) {
    context.rotate(Math.PI * 2 / 3);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, -height * 0.34);
    context.stroke();
  }
  context.restore();
};

const drawWindModel = (input: FacilityModelRenderInput, rise: number): void => {
  const { context, center, size, now } = input;
  const baseY = center.y - rise;
  drawIsoBox(context, center.x, baseY, size * 0.42, size * 0.2, size * 0.08, '#17445a', '#092638', '#061e2c', color.cyan);
  drawTurbine(context, center.x, baseY - size * 0.02, size * 0.72, now);
};

const drawGasModel = (input: FacilityModelRenderInput, rise: number): void => {
  const { context, center, size, now, facility } = input;
  const baseY = center.y - rise;
  drawIsoBox(context, center.x - size * 0.09, baseY, size * 0.52, size * 0.28, size * 0.32, '#375268', '#183448', '#10283a', '#809bab');
  drawIsoBox(context, center.x + size * 0.2, baseY - size * 0.02, size * 0.24, size * 0.18, size * 0.2, '#2f485b', '#142d3d', '#0d2332', color.orange);
  for (const offset of [-0.12, 0.02]) {
    const x = center.x + size * offset;
    const stackTop = baseY - size * 0.58;
    context.fillStyle = '#657f8f';
    context.fillRect(x - size * 0.025, stackTop, size * 0.05, size * 0.3);
    context.strokeStyle = '#a9c0cc';
    context.strokeRect(x - size * 0.025, stackTop, size * 0.05, size * 0.3);
    if (facility.enabled) {
      for (let particle = 0; particle < 3; particle += 1) {
        const phase = (now / 1250 + particle * 0.31 + offset) % 1;
        context.fillStyle = `rgba(255, 157, 88, ${0.28 * (1 - phase)})`;
        context.beginPath();
        context.arc(x + Math.sin(phase * 7) * 4, stackTop - phase * size * 0.25, size * (0.025 + phase * 0.035), 0, Math.PI * 2);
        context.fill();
      }
    }
  }
};

const drawBatteryUnit = (
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  storageRatio: number
): void => {
  drawIsoBox(context, x, groundY, size, size * 0.46, size * 0.52, '#235a60', '#123c42', '#0b3037', color.green);
  context.fillStyle = 'rgba(3, 19, 26, .9)';
  context.fillRect(x - size * 0.24, groundY - size * 0.38, size * 0.48, size * 0.12);
  context.fillStyle = color.green;
  context.fillRect(x - size * 0.21, groundY - size * 0.35, size * 0.42 * storageRatio, size * 0.06);
};

const drawBatteryModel = (input: FacilityModelRenderInput, rise: number, campus: boolean): void => {
  const { context, center, size, facility, now } = input;
  const baseY = center.y - rise;
  drawIsoBox(context, center.x, baseY, size * 0.68, size * 0.3, size * 0.07, '#17444a', '#092d34', '#06242c', color.green);
  const unitSize = campus ? size * 0.22 : size * 0.3;
  const columns = campus ? [-1.05, -0.35, 0.35, 1.05] : [-0.55, 0.55];
  const rows = campus ? [-0.34, 0.34] : [0];
  for (const row of rows) {
    for (const column of columns) {
      drawBatteryUnit(
        context,
        center.x + column * unitSize,
        baseY - row * unitSize * 0.45,
        unitSize,
        facility.storageRatio
      );
    }
  }
  if (facility.enabled) {
    context.save();
    context.strokeStyle = 'rgba(92, 225, 163, .55)';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(center.x, baseY - size * 0.22, size * (0.32 + Math.sin(now / 350) * 0.025), size * 0.12, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
};

const drawOffshoreModel = (input: FacilityModelRenderInput, rise: number): void => {
  const { context, center, size, now } = input;
  const baseY = center.y - rise;
  context.save();
  context.fillStyle = 'rgba(28, 119, 160, .48)';
  context.strokeStyle = 'rgba(74, 215, 255, .78)';
  context.beginPath();
  context.ellipse(center.x, baseY + size * 0.03, size * 0.38, size * 0.12, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
  drawIsoBox(context, center.x, baseY, size * 0.58, size * 0.24, size * 0.06, '#1c5269', '#0c3447', '#082838', color.cyan);
  drawTurbine(context, center.x - size * 0.17, baseY - size * 0.02, size * 0.58, now);
  drawTurbine(context, center.x + size * 0.17, baseY - size * 0.02, size * 0.58, now + 600);
};

const drawCoolingTower = (
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  width: number,
  height: number
): void => {
  context.save();
  const topWidth = width * 0.58;
  context.fillStyle = '#9db1bd';
  context.strokeStyle = '#d7e5ec';
  context.beginPath();
  context.moveTo(x - width / 2, groundY);
  context.lineTo(x - topWidth / 2, groundY - height);
  context.lineTo(x + topWidth / 2, groundY - height);
  context.lineTo(x + width / 2, groundY);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = '#e8f0f4';
  context.beginPath();
  context.ellipse(x, groundY - height, topWidth / 2, width * 0.12, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
};

const drawNuclearModel = (input: FacilityModelRenderInput, rise: number): void => {
  const { context, center, size, now, facility } = input;
  const baseY = center.y - rise;
  drawIsoBox(context, center.x, baseY, size * 0.72, size * 0.3, size * 0.08, '#3b4960', '#1c2c40', '#132237', color.purple);
  drawCoolingTower(context, center.x - size * 0.17, baseY - size * 0.02, size * 0.24, size * 0.45);
  drawCoolingTower(context, center.x + size * 0.17, baseY - size * 0.02, size * 0.24, size * 0.45);
  context.fillStyle = '#263f59';
  context.strokeStyle = color.purple;
  context.beginPath();
  context.arc(center.x, baseY - size * 0.22, size * 0.13, Math.PI, 0);
  context.lineTo(center.x + size * 0.13, baseY);
  context.lineTo(center.x - size * 0.13, baseY);
  context.closePath();
  context.fill();
  context.stroke();
  if (facility.enabled) {
    const pulse = 0.55 + Math.sin(now / 430) * 0.2;
    context.strokeStyle = `rgba(184, 160, 255, ${pulse})`;
    context.beginPath();
    context.arc(center.x, baseY - size * 0.2, size * 0.18, 0, Math.PI * 2);
    context.stroke();
  }
};

const drawGenericModel = (input: FacilityModelRenderInput, rise: number): void => {
  const { context, center, size, accent } = input;
  const baseY = center.y - rise;
  drawIsoBox(context, center.x, baseY, size * 0.5, size * 0.24, size * 0.48, rgba(accent, 0.42), '#153246', '#0d2637', rgba(accent, 0.85));
};

export class FacilityModelRenderer {
  draw(input: FacilityModelRenderInput): void {
    const progress = clamp01(input.progress);
    drawFoundation(input.context, input.center, input.size, input.accent, progress);

    if (progress < 0.26) {
      drawConstructionSparks(input.context, input.center, input.size, input.now);
      return;
    }
    if (progress < 0.58) {
      drawScaffolding(input.context, input.center, input.size, (progress - 0.26) / 0.32, input.now);
      drawConstructionSparks(input.context, input.center, input.size, input.now);
    }

    const structureProgress = clamp01((progress - 0.35) / 0.65);
    const rise = (1 - structureProgress) * input.size * 0.42;
    input.context.save();
    input.context.globalAlpha = input.facility.enabled ? Math.max(0.42, structureProgress) : Math.max(0.2, structureProgress * 0.45);
    input.context.shadowColor = rgba(input.accent, input.facility.enabled ? 0.62 : 0.16);
    input.context.shadowBlur = input.facility.enabled ? 16 : 4;

    const kind = resolveFacilityModelKind(input.facility.configId);
    if (kind === 'solar') drawSolarModel(input, rise);
    else if (kind === 'wind') drawWindModel(input, rise);
    else if (kind === 'gas') drawGasModel(input, rise);
    else if (kind === 'battery') drawBatteryModel(input, rise, false);
    else if (kind === 'batteryCampus') drawBatteryModel(input, rise, true);
    else if (kind === 'offshoreWind') drawOffshoreModel(input, rise);
    else if (kind === 'nuclear') drawNuclearModel(input, rise);
    else drawGenericModel(input, rise);
    input.context.restore();
  }
}
