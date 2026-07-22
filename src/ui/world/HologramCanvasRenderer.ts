import type {
  CitySceneState,
  DistrictSceneState,
  FacilitySceneState,
  PlotSceneState,
  ScenePoint
} from '../../presentation/CitySceneMapper';
import {
  getDiamondPoints,
  projectWorldPoint,
  type HologramViewport,
  type SandboxCameraState,
  type ScreenPoint
} from './HologramGeometry';

export interface HologramHitRegion {
  kind: 'plot' | 'facility';
  id: string;
  polygon: ScreenPoint[];
  enabled: boolean;
}

export interface HologramRenderInput {
  context: CanvasRenderingContext2D;
  viewport: HologramViewport;
  state: CitySceneState;
  camera: SandboxCameraState;
  now: number;
  hovered?: { kind: HologramHitRegion['kind']; id: string };
  constructionStartedAt: ReadonlyMap<string, number>;
  resolveImage: (assetId: string) => HTMLImageElement | undefined;
}

type Rgb = readonly [number, number, number];
type CanvasFill = string | CanvasGradient | CanvasPattern;

const zoneColors: Record<PlotSceneState['zone'], Rgb> = {
  neighborhood: [64, 196, 255],
  industrial: [255, 152, 77],
  coastal: [74, 215, 255],
  outskirts: [122, 224, 154],
  utility: [151, 132, 255]
};

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp(value), 3);
const rgba = (color: Rgb, alpha: number): string => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

const parseHex = (value: string): Rgb => {
  const normalized = value.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [74, 215, 255];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
};

const tracePolygon = (context: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
};

const drawExtrudedDiamond = (
  context: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  depth: number,
  topFill: CanvasFill,
  sideFill: CanvasFill,
  stroke: CanvasFill,
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

const drawTextChip = (
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  title: string,
  detail: string,
  accent: Rgb,
  offsetY: number
): void => {
  const width = Math.max(118, Math.min(220, Math.max(title.length * 13, detail.length * 8) + 28));
  const height = 43;
  const x = center.x - width / 2;
  const y = center.y + offsetY;
  context.save();
  context.fillStyle = 'rgba(2, 16, 28, .9)';
  context.strokeStyle = rgba(accent, 0.58);
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, height, 10);
  context.fill();
  context.stroke();
  context.fillStyle = '#f0f8ff';
  context.font = '700 12px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(title, center.x, y + 17, width - 16);
  context.fillStyle = 'rgba(191, 220, 235, .8)';
  context.font = '10px system-ui, sans-serif';
  context.fillText(detail, center.x, y + 33, width - 16);
  context.restore();
};

export class HologramCanvasRenderer {
  render(input: HologramRenderInput): HologramHitRegion[] {
    const { context, viewport, state, camera, now } = input;
    const accent = parseHex(state.accent);
    context.clearRect(0, 0, viewport.width, viewport.height);
    this.drawBackdrop(context, viewport, accent, state.hour, state.pollutionRatio);
    this.drawSandboxBase(context, viewport, camera, accent, now);
    this.drawDistricts(input);
    this.drawEnergyLinks(input);
    this.drawCityCore(input);
    const hits = this.drawPlotsAndFacilities(input);
    this.drawScanSweep(context, viewport, camera, accent, now);
    this.drawCornerTelemetry(context, viewport, state, accent);
    return hits;
  }

  private drawBackdrop(
    context: CanvasRenderingContext2D,
    viewport: HologramViewport,
    accent: Rgb,
    hour: number,
    pollutionRatio: number
  ): void {
    const night = hour < 6 || hour >= 19;
    const gradient = context.createRadialGradient(
      viewport.width * 0.5,
      viewport.height * 0.4,
      20,
      viewport.width * 0.5,
      viewport.height * 0.45,
      Math.max(viewport.width, viewport.height) * 0.72
    );
    gradient.addColorStop(0, night ? 'rgba(8, 43, 66, 1)' : 'rgba(13, 58, 75, 1)');
    gradient.addColorStop(0.48, 'rgba(3, 21, 35, 1)');
    gradient.addColorStop(1, 'rgba(1, 7, 13, 1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.save();
    context.strokeStyle = rgba(accent, 0.07);
    context.lineWidth = 1;
    const horizon = viewport.height * 0.24;
    for (let row = 0; row < 12; row += 1) {
      const progress = row / 11;
      const y = horizon + Math.pow(progress, 1.7) * viewport.height * 0.82;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(viewport.width, y);
      context.stroke();
    }
    for (let column = -12; column <= 12; column += 1) {
      context.beginPath();
      context.moveTo(viewport.width * 0.5, horizon);
      context.lineTo(viewport.width * 0.5 + column * viewport.width * 0.09, viewport.height);
      context.stroke();
    }
    context.restore();

    if (pollutionRatio > 0.2) {
      const haze = context.createLinearGradient(0, viewport.height * 0.2, 0, viewport.height);
      haze.addColorStop(0, 'rgba(255, 137, 72, 0)');
      haze.addColorStop(1, `rgba(126, 68, 48, ${pollutionRatio * 0.19})`);
      context.fillStyle = haze;
      context.fillRect(0, 0, viewport.width, viewport.height);
    }
  }

  private drawSandboxBase(
    context: CanvasRenderingContext2D,
    viewport: HologramViewport,
    camera: SandboxCameraState,
    accent: Rgb,
    now: number
  ): void {
    const points = getDiamondPoints({ x: 0, z: 0, elevation: -1.8 }, 60, 44, camera, viewport);
    const top = context.createLinearGradient(0, viewport.height * 0.24, 0, viewport.height * 0.86);
    top.addColorStop(0, 'rgba(11, 52, 67, .92)');
    top.addColorStop(0.48, 'rgba(5, 31, 43, .95)');
    top.addColorStop(1, 'rgba(2, 20, 31, .98)');
    context.save();
    context.shadowColor = rgba(accent, 0.7);
    context.shadowBlur = 30;
    drawExtrudedDiamond(context, points, 24 * camera.zoom, top, 'rgba(2, 13, 23, .98)', rgba(accent, 0.82), 2);
    context.restore();

    context.save();
    tracePolygon(context, points);
    context.strokeStyle = rgba(accent, 0.48 + Math.sin(now / 850) * 0.12);
    context.lineWidth = 4;
    context.setLineDash([20, 14]);
    context.lineDashOffset = -now / 80;
    context.stroke();
    context.restore();
  }

  private drawDistricts(input: HologramRenderInput): void {
    const { context, viewport, state, camera } = input;
    const districts = [...state.districts].sort((left, right) => left.x + left.z - right.x - right.z);
    for (const district of districts) this.drawDistrict(context, viewport, camera, district);
  }

  private drawDistrict(
    context: CanvasRenderingContext2D,
    viewport: HologramViewport,
    camera: SandboxCameraState,
    district: DistrictSceneState
  ): void {
    const color = zoneColors[district.id];
    const points = getDiamondPoints(district, district.radiusX, district.radiusZ, camera, viewport);
    drawExtrudedDiamond(
      context,
      points,
      Math.max(5, 8 * camera.zoom),
      rgba(color, 0.08 + district.powerRatio * 0.12),
      'rgba(2, 15, 24, .7)',
      rgba(color, 0.18 + district.powerRatio * 0.26),
      1
    );
    const center = projectWorldPoint(district, camera, viewport);
    context.save();
    context.fillStyle = rgba(color, 0.55 + district.powerRatio * 0.35);
    context.font = '700 10px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(district.label, center.x, center.y + 5);
    context.restore();
  }

  private drawEnergyLinks(input: HologramRenderInput): void {
    const { context, viewport, state, camera, now } = input;
    const accent = parseHex(state.accent);
    state.links.forEach((link, index) => {
      const from = projectWorldPoint(link.from, camera, viewport);
      const to = projectWorldPoint(link.to, camera, viewport);
      const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 18 * camera.zoom };
      context.save();
      context.lineCap = 'round';
      context.strokeStyle = link.active ? rgba(accent, 0.24 + link.intensity * 0.34) : 'rgba(88, 112, 126, .12)';
      context.lineWidth = link.active ? 1.5 + link.intensity * 1.2 : 1;
      context.setLineDash(link.active ? [8, 7] : [3, 8]);
      context.lineDashOffset = link.active ? -now / 55 : 0;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(control.x, control.y, to.x, to.y);
      context.stroke();
      if (link.active) {
        const t = (now / 1800 + index * 0.23) % 1;
        const inverse = 1 - t;
        const x = inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x;
        const y = inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y;
        context.shadowColor = rgba(accent, 0.9);
        context.shadowBlur = 12;
        context.fillStyle = rgba(accent, 0.95);
        context.beginPath();
        context.arc(x, y, 2.4 + link.intensity, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });
  }

  private drawCityCore(input: HologramRenderInput): void {
    const { context, viewport, state, camera, now } = input;
    const center = projectWorldPoint(state.city, camera, viewport);
    const accent = parseHex(state.accent);
    const night = state.hour < 6 || state.hour >= 19;
    context.save();
    context.translate(center.x, center.y);
    context.strokeStyle = rgba(accent, 0.55);
    context.lineWidth = 2;
    context.setLineDash([10, 8]);
    context.lineDashOffset = -now / 70;
    context.beginPath();
    context.ellipse(0, 8, 74 * camera.zoom, 29 * camera.zoom, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = rgba(accent, 0.06);
    context.fill();

    const towers = [
      { x: -42, w: 18, h: 52 },
      { x: -20, w: 22, h: 78 },
      { x: 7, w: 24, h: 102 },
      { x: 35, w: 18, h: 66 }
    ];
    for (const tower of towers) {
      const width = tower.w * camera.zoom;
      const height = tower.h * camera.zoom;
      const x = tower.x * camera.zoom;
      const y = 2 * camera.zoom - height;
      const facade = context.createLinearGradient(x, y, x + width, y + height);
      facade.addColorStop(0, rgba(accent, 0.76));
      facade.addColorStop(1, 'rgba(6, 31, 45, .96)');
      context.fillStyle = facade;
      context.strokeStyle = rgba(accent, 0.85);
      context.fillRect(x, y, width, height);
      context.strokeRect(x, y, width, height);
      context.fillStyle = night ? 'rgba(255, 221, 115, .9)' : rgba(accent, 0.56);
      for (let windowY = y + 8; windowY < y + height - 5; windowY += 10 * camera.zoom) {
        for (let windowX = x + 5; windowX < x + width - 3; windowX += 8 * camera.zoom) {
          context.fillRect(windowX, windowY, Math.max(1.5, 2.5 * camera.zoom), Math.max(1.5, 3 * camera.zoom));
        }
      }
    }
    context.restore();
    drawTextChip(
      context,
      center,
      state.cityName,
      `${state.population.toLocaleString('zh-CN')} 位居民 · ${Math.round(state.supplyRatio * 100)}% 正常用电`,
      accent,
      29 * camera.zoom
    );
  }

  private drawPlotsAndFacilities(input: HologramRenderInput): HologramHitRegion[] {
    const plots = [...input.state.plots].sort((left, right) => left.x + left.z - right.x - right.z);
    const facilities = new Map(input.state.facilities.map((facility) => [facility.plotId, facility]));
    return plots.map((plot) => this.drawPlot(input, plot, facilities.get(plot.id)));
  }

  private drawPlot(
    input: HologramRenderInput,
    plot: PlotSceneState,
    facility?: FacilitySceneState
  ): HologramHitRegion {
    const { context, viewport, camera, now, hovered } = input;
    const color = zoneColors[plot.zone];
    const points = getDiamondPoints(plot, 5.5 * plot.scale, 4.3 * plot.scale, camera, viewport);
    const hitId = facility?.instanceId ?? plot.id;
    const isHovered = hovered?.id === hitId;
    const pulse = 0.5 + Math.sin(now / 240) * 0.28;
    drawExtrudedDiamond(
      context,
      points,
      Math.max(4, 6 * camera.zoom),
      plot.blocked ? 'rgba(25, 30, 35, .24)' : rgba(color, plot.available ? 0.2 + pulse * 0.16 : plot.occupied ? 0.16 : 0.07),
      'rgba(1, 12, 20, .78)',
      plot.blocked ? 'rgba(91, 108, 119, .18)' : rgba(color, plot.available ? 0.75 + pulse * 0.2 : isHovered ? 0.9 : 0.34),
      plot.available || isHovered ? 2 : 1
    );

    const center = projectWorldPoint(plot, camera, viewport);
    if (plot.available) this.drawAvailablePlot(context, center, color, camera, pulse, isHovered, plot.label);
    if (facility) this.drawFacility(input, facility, center, color, isHovered);

    return {
      kind: facility ? 'facility' : 'plot',
      id: hitId,
      polygon: points,
      enabled: facility ? true : plot.available
    };
  }

  private drawAvailablePlot(
    context: CanvasRenderingContext2D,
    center: ScreenPoint,
    color: Rgb,
    camera: SandboxCameraState,
    pulse: number,
    hovered: boolean,
    label: string
  ): void {
    context.save();
    context.strokeStyle = rgba(color, pulse);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(center.x, center.y - 5, (20 + pulse * 7) * camera.zoom, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#e9fbff';
    context.font = `700 ${Math.max(11, 13 * camera.zoom)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.fillText('+', center.x, center.y + 1);
    context.restore();
    if (hovered) drawTextChip(context, center, label, '点击这里开始建设', color, 17 * camera.zoom);
  }

  private drawFacility(
    input: HologramRenderInput,
    facility: FacilitySceneState,
    center: ScreenPoint,
    color: Rgb,
    hovered: boolean
  ): void {
    const { context, camera, now, constructionStartedAt, resolveImage } = input;
    const startedAt = constructionStartedAt.get(facility.instanceId);
    const progress = startedAt === undefined ? 1 : easeOutCubic((now - startedAt) / 850);
    const size = clamp(76 * facility.scale * camera.zoom, 48, 132);
    const rise = (1 - progress) * 42;
    const image = resolveImage(facility.assetId);

    context.save();
    context.globalAlpha = facility.enabled ? progress : progress * 0.45;
    context.shadowColor = rgba(color, facility.enabled ? 0.75 : 0.2);
    context.shadowBlur = facility.enabled ? 20 : 6;
    context.fillStyle = 'rgba(0, 0, 0, .34)';
    context.beginPath();
    context.ellipse(center.x, center.y + 4, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
    context.fill();
    if (image?.complete && image.naturalWidth > 0) {
      context.drawImage(image, center.x - size / 2, center.y - size * 0.88 - rise, size, size);
    } else {
      this.drawFacilityFallback(context, center, size, color, facility, rise);
    }
    context.restore();
    this.drawFacilityEffects(input, facility, center, size, progress);

    if (hovered) {
      const detail = facility.category === 'storage'
        ? `备用电 ${Math.round(facility.storageRatio * 100)}% · ${facility.enabled ? '运行中' : '已关闭'}`
        : `供电 ${Math.round(facility.output)} MW · ${facility.enabled ? '运行中' : '已关闭'}`;
      drawTextChip(context, center, `${facility.name} · ${facility.level}级`, detail, color, 15 * camera.zoom);
    }
  }

  private drawFacilityFallback(
    context: CanvasRenderingContext2D,
    center: ScreenPoint,
    size: number,
    color: Rgb,
    facility: FacilitySceneState,
    rise: number
  ): void {
    const x = center.x - size * 0.3;
    const y = center.y - size * 0.58 - rise;
    context.fillStyle = 'rgba(4, 28, 41, .96)';
    context.strokeStyle = rgba(color, 0.9);
    context.lineWidth = 2;
    context.fillRect(x, y, size * 0.6, size * 0.55);
    context.strokeRect(x, y, size * 0.6, size * 0.55);
    context.fillStyle = rgba(color, 0.76);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        context.fillRect(x + 8 + column * size * 0.15, y + 8 + row * size * 0.13, size * 0.06, size * 0.07);
      }
    }
    if (facility.category === 'storage') {
      context.fillStyle = '#74efb6';
      context.fillRect(x + size * 0.14, y + size * 0.44, size * 0.32 * facility.storageRatio, 4);
    }
  }

  private drawFacilityEffects(
    input: HologramRenderInput,
    facility: FacilitySceneState,
    center: ScreenPoint,
    size: number,
    progress: number
  ): void {
    const { context, camera, now } = input;
    if (!facility.enabled || progress < 0.98) return;
    if (facility.configId.includes('wind')) {
      context.save();
      context.translate(center.x, center.y - size * 0.58);
      context.rotate(now / 850);
      context.strokeStyle = 'rgba(225, 249, 255, .85)';
      context.lineWidth = Math.max(1, camera.zoom * 1.5);
      for (let blade = 0; blade < 3; blade += 1) {
        context.rotate(Math.PI * 2 / 3);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -size * 0.19);
        context.stroke();
      }
      context.restore();
    }
    if (facility.configId.includes('gas')) {
      context.save();
      context.fillStyle = 'rgba(255, 150, 72, .42)';
      for (let particle = 0; particle < 3; particle += 1) {
        const phase = (now / 900 + particle * 0.31) % 1;
        context.beginPath();
        context.arc(center.x + (particle - 1) * 7, center.y - size * 0.72 - phase * 25, 4 + phase * 4, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
    if (facility.category === 'storage') {
      context.save();
      context.strokeStyle = 'rgba(92, 225, 163, .58)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(center.x, center.y - size * 0.37, size * 0.27 + Math.sin(now / 300) * 3, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  private drawScanSweep(
    context: CanvasRenderingContext2D,
    viewport: HologramViewport,
    camera: SandboxCameraState,
    accent: Rgb,
    now: number
  ): void {
    const progress = (now / 5200) % 1;
    const y = viewport.height * (0.22 + progress * 0.58) + camera.offsetY * 0.25;
    const gradient = context.createLinearGradient(0, y - 18, 0, y + 18);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, rgba(accent, 0.12));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(viewport.width * 0.08, y - 18, viewport.width * 0.84, 36);
  }

  private drawCornerTelemetry(
    context: CanvasRenderingContext2D,
    viewport: HologramViewport,
    state: CitySceneState,
    accent: Rgb
  ): void {
    context.save();
    context.fillStyle = rgba(accent, 0.5);
    context.font = '10px ui-monospace, SFMono-Regular, monospace';
    context.textAlign = 'left';
    context.fillText(`HOLOGRAM CITY / ${state.levelId.toUpperCase()}`, 18, viewport.height - 18);
    context.textAlign = 'right';
    context.fillText(`DAY ${state.day} · ${String(Math.floor(state.hour)).padStart(2, '0')}:00`, viewport.width - 18, viewport.height - 18);
    context.restore();
  }
}
