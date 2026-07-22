import type {
  AmbientBlockSceneState,
  CitySceneState,
  RoadSceneState,
  ScenePoint
} from '../../presentation/CitySceneTypes';
import { stableVisualHash } from '../../presentation/CitySceneVisuals';
import {
  projectWorldPoint,
  type HologramViewport,
  type SandboxCameraState,
  type ScreenPoint
} from './HologramGeometry';
import { drawIsoBox, rgba, type Rgb } from './HologramDrawing';

const zoneColors = {
  neighborhood: [64, 196, 255],
  industrial: [255, 152, 77],
  coastal: [74, 215, 255],
  outskirts: [122, 224, 154],
  utility: [151, 132, 255]
} as const satisfies Record<AmbientBlockSceneState['zone'], Rgb>;

interface CityLifeRenderInput {
  context: CanvasRenderingContext2D;
  viewport: HologramViewport;
  camera: SandboxCameraState;
  state: CitySceneState;
  now: number;
}

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const projectedRoad = (
  road: RoadSceneState,
  camera: SandboxCameraState,
  viewport: HologramViewport
): ScreenPoint[] => road.points.map((point) => projectWorldPoint(point, camera, viewport));

const pointAlongPolyline = (points: readonly ScreenPoint[], progress: number): ScreenPoint => {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0] ?? { x: 0, y: 0 };
  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    const length = Math.hypot(current.x - previous.x, current.y - previous.y);
    lengths.push(length);
    total += length;
  }
  if (total <= 0) return points[0] ?? { x: 0, y: 0 };
  let remaining = clamp(progress) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index] ?? 0;
    const from = points[index];
    const to = points[index + 1];
    if (!from || !to) continue;
    if (remaining <= length) {
      const ratio = length > 0 ? remaining / length : 0;
      return {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      };
    }
    remaining -= length;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
};

const drawPath = (
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[]
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
};

const drawWindows = (
  context: CanvasRenderingContext2D,
  block: AmbientBlockSceneState,
  center: ScreenPoint,
  width: number,
  height: number,
  night: boolean,
  now: number
): void => {
  if (block.floors <= 0) return;
  const columns = Math.max(2, Math.floor(width / 10));
  const floors = Math.min(8, Math.max(2, block.floors));
  const seed = block.lightSeed;
  const blackoutFlicker = block.powerRatio < 0.65
    ? 0.55 + Math.sin(now / 180 + seed % 11) * 0.45
    : 1;
  context.save();
  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      const hash = stableVisualHash(`${seed}:${floor}:${column}`);
      const occupied = hash % 100 < 68;
      const powered = (hash % 1000) / 1000 < block.powerRatio * blackoutFlicker;
      const lit = occupied && powered && (night || hash % 5 === 0);
      const x = center.x - width * 0.34 + column * width * 0.68 / Math.max(1, columns - 1);
      const y = center.y - height * 0.18 - floor * height * 0.65 / Math.max(1, floors - 1);
      context.fillStyle = lit
        ? block.zone === 'industrial' ? 'rgba(255, 168, 87, .86)' : 'rgba(255, 222, 121, .9)'
        : 'rgba(27, 75, 92, .28)';
      context.fillRect(x, y, Math.max(1.3, width * 0.045), Math.max(1.5, height * 0.045));
    }
  }
  context.restore();
};

const drawTree = (
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  size: number,
  powerRatio: number
): void => {
  context.save();
  context.strokeStyle = 'rgba(80, 144, 104, .85)';
  context.lineWidth = Math.max(1, size * 0.08);
  context.beginPath();
  context.moveTo(center.x, center.y);
  context.lineTo(center.x, center.y - size * 0.45);
  context.stroke();
  context.fillStyle = `rgba(92, 225, 163, ${0.25 + powerRatio * 0.52})`;
  context.beginPath();
  context.arc(center.x, center.y - size * 0.62, size * 0.28, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

export class CityLifeRenderer {
  drawRoads(input: CityLifeRenderInput): void {
    const { context, viewport, camera, state, now } = input;
    for (const road of state.roads) {
      const points = projectedRoad(road, camera, viewport);
      context.save();
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = 'rgba(2, 10, 17, .88)';
      context.lineWidth = (road.laneCount === 2 ? 9 : 6) * camera.zoom;
      drawPath(context, points);
      context.stroke();
      context.strokeStyle = road.powered ? 'rgba(63, 160, 196, .38)' : 'rgba(60, 72, 78, .2)';
      context.lineWidth = (road.laneCount === 2 ? 5 : 3.5) * camera.zoom;
      drawPath(context, points);
      context.stroke();
      context.setLineDash([5 * camera.zoom, 7 * camera.zoom]);
      context.lineDashOffset = -now / 240;
      context.strokeStyle = road.powered ? 'rgba(146, 220, 238, .34)' : 'rgba(90, 99, 102, .12)';
      context.lineWidth = Math.max(0.7, camera.zoom);
      drawPath(context, points);
      context.stroke();
      context.restore();
    }
  }

  drawAmbientBlocks(input: CityLifeRenderInput): void {
    const { context, viewport, camera, state, now } = input;
    const night = state.hour < 6 || state.hour >= 19;
    const ordered = [...state.ambientBlocks].sort((left, right) => left.x + left.z - right.x - right.z);
    for (const block of ordered) {
      const center = projectWorldPoint(block, camera, viewport);
      const accent = zoneColors[block.zone];
      const width = Math.max(12, block.width * 3.6 * camera.zoom);
      const depth = Math.max(6, block.depth * 2.2 * camera.zoom);
      const height = Math.max(5, block.height * 2.7 * camera.zoom);
      const blackoutAlpha = 0.35 + block.powerRatio * 0.65;

      if (block.kind === 'park') {
        context.save();
        context.fillStyle = `rgba(31, 104, 73, ${0.18 + block.powerRatio * 0.24})`;
        context.strokeStyle = rgba(accent, 0.26);
        context.beginPath();
        context.ellipse(center.x, center.y, width * 0.55, depth * 0.62, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
        for (let index = 0; index < 4; index += 1) {
          drawTree(
            context,
            {
              x: center.x + (index - 1.5) * width * 0.18,
              y: center.y + (index % 2 === 0 ? -1 : 1) * depth * 0.15
            },
            10 * camera.zoom,
            block.powerRatio
          );
        }
        continue;
      }

      const top = block.kind === 'industrial'
        ? `rgba(72, 83, 91, ${0.72 * blackoutAlpha})`
        : block.kind === 'utility'
          ? `rgba(48, 78, 105, ${0.74 * blackoutAlpha})`
          : `rgba(38, 91, 116, ${0.78 * blackoutAlpha})`;
      drawIsoBox(
        context,
        center.x,
        center.y,
        width,
        depth,
        height,
        top,
        `rgba(11, 42, 55, ${0.92 * blackoutAlpha})`,
        `rgba(6, 31, 43, ${0.95 * blackoutAlpha})`,
        rgba(accent, 0.28 + block.powerRatio * 0.38)
      );
      drawWindows(context, block, center, width, height, night, now);

      if (block.kind === 'industrial') {
        context.save();
        const stackX = center.x + width * 0.22;
        const stackTop = center.y - height - depth * 0.12;
        context.fillStyle = 'rgba(116, 133, 142, .8)';
        context.fillRect(stackX, stackTop, Math.max(2, width * 0.06), height * 0.46);
        context.fillStyle = `rgba(255, 144, 74, ${0.08 + state.pollutionRatio * 0.24})`;
        const smokePhase = (now / 1600 + block.lightSeed % 9) % 1;
        context.beginPath();
        context.arc(stackX + Math.sin(smokePhase * 5) * 4, stackTop - smokePhase * 18, 4 + smokePhase * 5, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  }

  drawTraffic(input: CityLifeRenderInput): void {
    const { context, viewport, camera, state, now } = input;
    for (const road of state.roads) {
      const points = projectedRoad(road, camera, viewport);
      const vehicleCount = Math.max(0, Math.round(road.traffic * state.trafficDensity * (road.laneCount === 2 ? 3 : 2)));
      for (let index = 0; index < vehicleCount; index += 1) {
        const seed = stableVisualHash(`${road.id}:${index}`);
        const direction = seed % 2 === 0 ? 1 : -1;
        const raw = (now / (6200 - road.traffic * 2500) + index / Math.max(1, vehicleCount) + (seed % 100) / 100) % 1;
        const progress = direction === 1 ? raw : 1 - raw;
        const position = pointAlongPolyline(points, progress);
        const ahead = pointAlongPolyline(points, clamp(progress + 0.012 * direction));
        const angle = Math.atan2(ahead.y - position.y, ahead.x - position.x);
        context.save();
        context.translate(position.x, position.y - 2 * camera.zoom);
        context.rotate(angle);
        context.fillStyle = road.powered
          ? seed % 3 === 0 ? '#ffca6b' : seed % 3 === 1 ? '#5ce1a3' : '#4ad7ff'
          : 'rgba(92, 102, 107, .45)';
        context.shadowColor = road.powered ? 'rgba(74, 215, 255, .75)' : 'transparent';
        context.shadowBlur = road.powered ? 7 : 0;
        context.fillRect(-3.5 * camera.zoom, -1.6 * camera.zoom, 7 * camera.zoom, 3.2 * camera.zoom);
        context.fillStyle = 'rgba(237, 250, 255, .86)';
        context.fillRect(1.5 * camera.zoom, -1.2 * camera.zoom, 1.4 * camera.zoom, 2.4 * camera.zoom);
        context.restore();
      }
    }
  }

  drawBlackoutSignals(input: CityLifeRenderInput, accent: Rgb): void {
    const { context, viewport, camera, state, now } = input;
    if (state.blackoutIntensity <= 0.02) return;
    const pulse = 0.55 + Math.sin(now / 260) * 0.28;
    for (const district of state.districts) {
      if (district.powerRatio >= 0.92) continue;
      const center = projectWorldPoint(district, camera, viewport);
      const severity = 1 - district.powerRatio;
      context.save();
      context.strokeStyle = severity > 0.55
        ? `rgba(255, 88, 105, ${pulse * severity})`
        : rgba(accent, 0.18 + pulse * severity * 0.35);
      context.lineWidth = Math.max(1.5, 2.5 * camera.zoom);
      context.setLineDash([9, 7]);
      context.lineDashOffset = now / 70;
      context.beginPath();
      context.ellipse(
        center.x,
        center.y,
        district.radiusX * 3.5 * camera.zoom,
        district.radiusZ * 1.45 * camera.zoom,
        0,
        0,
        Math.PI * 2
      );
      context.stroke();
      context.restore();
    }
  }
}
