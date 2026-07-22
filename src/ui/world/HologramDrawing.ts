import type { ScreenPoint } from './HologramGeometry';

export type Rgb = readonly [number, number, number];

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const rgba = (color: Rgb, alpha: number): string =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

export const parseHex = (value: string): Rgb => {
  const normalized = value.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [74, 215, 255];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
};

export const tracePolygon = (
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[]
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
};

export const drawExtrudedDiamond = (
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  depth: number,
  topFill: string | CanvasGradient,
  sideFill: string | CanvasGradient,
  stroke: string,
  lineWidth = 1
): void => {
  const left = points[0];
  const back = points[1];
  const right = points[2];
  const front = points[3];
  if (!left || !back || !right || !front) return;

  context.save();
  context.fillStyle = sideFill;
  context.beginPath();
  context.moveTo(left.x, left.y);
  context.lineTo(front.x, front.y);
  context.lineTo(front.x, front.y + depth);
  context.lineTo(left.x, left.y + depth);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(front.x, front.y);
  context.lineTo(right.x, right.y);
  context.lineTo(right.x, right.y + depth);
  context.lineTo(front.x, front.y + depth);
  context.closePath();
  context.fill();

  tracePolygon(context, points);
  context.fillStyle = topFill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
};

export const drawIsoBox = (
  context: CanvasRenderingContext2D,
  centerX: number,
  groundY: number,
  width: number,
  depth: number,
  height: number,
  topFill: string,
  leftFill: string,
  rightFill: string,
  stroke: string
): void => {
  const topY = groundY - height;
  const top: ScreenPoint[] = [
    { x: centerX - width / 2, y: topY },
    { x: centerX, y: topY - depth / 2 },
    { x: centerX + width / 2, y: topY },
    { x: centerX, y: topY + depth / 2 }
  ];
  const left = top[0];
  const right = top[2];
  const front = top[3];
  if (!left || !right || !front) return;

  context.save();
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.fillStyle = leftFill;
  context.beginPath();
  context.moveTo(left.x, left.y);
  context.lineTo(front.x, front.y);
  context.lineTo(front.x, groundY + depth / 2);
  context.lineTo(left.x, groundY);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = rightFill;
  context.beginPath();
  context.moveTo(front.x, front.y);
  context.lineTo(right.x, right.y);
  context.lineTo(right.x, groundY);
  context.lineTo(front.x, groundY + depth / 2);
  context.closePath();
  context.fill();
  context.stroke();

  tracePolygon(context, top);
  context.fillStyle = topFill;
  context.fill();
  context.stroke();
  context.restore();
};

export const drawTextChip = (
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  title: string,
  detail: string,
  accent: Rgb,
  offsetY: number
): void => {
  const width = Math.max(118, Math.min(220, Math.max(title.length * 13, detail.length * 8) + 26));
  const height = 43;
  const x = center.x - width / 2;
  const y = center.y + offsetY;
  context.save();
  context.fillStyle = 'rgba(2, 16, 28, .9)';
  context.strokeStyle = rgba(accent, 0.56);
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, height, 10);
  context.fill();
  context.stroke();
  context.fillStyle = '#f0f8ff';
  context.font = '700 12px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(title, center.x, y + 17, width - 16);
  context.fillStyle = 'rgba(191, 220, 235, .78)';
  context.font = '10px system-ui, sans-serif';
  context.fillText(detail, center.x, y + 33, width - 16);
  context.restore();
};
