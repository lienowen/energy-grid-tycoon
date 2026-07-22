import type {
  CitySceneState,
  DistrictSceneState,
  FacilitySceneState,
  PlotSceneState
} from '../../presentation/CitySceneTypes';
import { CityLifeRenderer } from './CityLifeRenderer';
import { FacilityModelRenderer } from './FacilityModelRenderer';
import {
  getDiamondPoints,
  projectWorldPoint,
  type HologramViewport,
  type SandboxCameraState,
  type ScreenPoint
} from './HologramGeometry';
import {
  clamp01,
  drawExtrudedDiamond,
  drawIsoBox,
  drawTextChip,
  parseHex,
  rgba,
  type Rgb
} from './HologramDrawing';

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

const zoneColors = {
  neighborhood: [64, 196, 255],
  industrial: [255, 152, 77],
  coastal: [74, 215, 255],
  outskirts: [122, 224, 154],
  utility: [151, 132, 255]
} as const satisfies Record<PlotSceneState['zone'], Rgb>;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);

export class HologramCanvasRenderer {
  private readonly cityLife = new CityLifeRenderer();
  private readonly facilityModels = new FacilityModelRenderer();

  render(input: HologramRenderInput): HologramHitRegion[] {
    const { context, viewport, state, camera, now } = input;
    const accent = parseHex(state.accent);
    context.clearRect(0, 0, viewport.width, viewport.height);
    this.drawBackdrop(context, viewport, accent, state.hour, state.pollutionRatio);
    this.drawSandboxBase(context, viewport, camera, accent, now);
    this.drawDistricts(input);
    this.cityLife.drawRoads(input);
    this.cityLife.drawAmbientBlocks(input);
    this.drawEnergyLinks(input);
    this.drawCityCore(input);
    const hits = this.drawPlotsAndFacilities(input);
    this.cityLife.drawTraffic(input);
    this.cityLife.drawBlackoutSignals(input, accent);
    this.drawPlacementHint(input, accent);
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
      viewport.height * 0.38,
      10,
      viewport.width * 0.5,
      viewport.height * 0.45,
      Math.max(viewport.width, viewport.height) * 0.76
    );
    gradient.addColorStop(0, night ? 'rgba(8, 49, 71, 1)' : 'rgba(14, 67, 82, 1)');
    gradient.addColorStop(0.47, 'rgba(3, 22, 36, 1)');
    gradient.addColorStop(1, 'rgba(1, 7, 13, 1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.save();
    context.strokeStyle = rgba(accent, 0.065);
    context.lineWidth = 1;
    const horizon = viewport.height * 0.22;
    for (let row = 0; row < 13; row += 1) {
      const progress = row / 12;
      const y = horizon + Math.pow(progress, 1.65) * viewport.height * 0.82;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(viewport.width, y);
      context.stroke();
    }
    for (let column = -14; column <= 14; column += 1) {
      context.beginPath();
      context.moveTo(viewport.width * 0.5, horizon);
      context.lineTo(viewport.width * 0.5 + column * viewport.width * 0.075, viewport.height);
      context.stroke();
    }
    context.restore();

    if (pollutionRatio > 0.16) {
      const haze = context.createLinearGradient(0, viewport.height * 0.18, 0, viewport.height);
      haze.addColorStop(0, 'rgba(255, 137, 72, 0)');
      haze.addColorStop(1, `rgba(126, 68, 48, ${pollutionRatio * 0.22})`);
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
    const outer = getDiamondPoints({ x: 0, z: 0, elevation: -2 }, 62, 45, camera, viewport);
    const inner = getDiamondPoints({ x: 0, z: 0, elevation: -1.65 }, 58, 41, camera, viewport);
    context.save();
    context.shadowColor = rgba(accent, 0.7);
    context.shadowBlur = 34;
    const top = context.createLinearGradient(0, viewport.height * 0.25, 0, viewport.height * 0.86);
    top.addColorStop(0, 'rgba(12, 57, 72, .94)');
    top.addColorStop(0.5, 'rgba(5, 32, 45, .97)');
    top.addColorStop(1, 'rgba(2, 18, 29, .99)');
    drawExtrudedDiamond(
      context,
      outer,
      27 * camera.zoom,
      top,
      'rgba(1, 10, 18, .99)',
      rgba(accent, 0.9),
      2.2
    );
    context.restore();

    drawExtrudedDiamond(
      context,
      inner,
      4 * camera.zoom,
      'rgba(7, 42, 54, .65)',
      'rgba(2, 17, 26, .8)',
      rgba(accent, 0.3),
      1
    );

    const pulse = 0.48 + Math.sin(now / 850) * 0.13;
    context.save();
    context.strokeStyle = rgba(accent, pulse);
    context.lineWidth = 4;
    context.setLineDash([20, 14]);
    context.lineDashOffset = -now / 80;
    context.beginPath();
    const first = outer[0];
    if (first) {
      context.moveTo(first.x, first.y);
      for (const point of outer.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.stroke();
    }
    context.restore();
  }

  private drawDistricts(input: HologramRenderInput): void {
    const ordered = [...input.state.districts]
      .sort((left, right) => left.x + left.z - right.x - right.z);
    for (const district of ordered) this.drawDistrict(input, district);
  }

  private drawDistrict(input: HologramRenderInput, district: DistrictSceneState): void {
    const { context, viewport, camera, now } = input;
    const color = zoneColors[district.id];
    const points = getDiamondPoints(district, district.radiusX, district.radiusZ, camera, viewport);
    const powered = district.powerRatio;
    const flicker = powered < 0.6 ? 0.75 + Math.sin(now / 170 + district.x) * 0.22 : 1;
    drawExtrudedDiamond(
      context,
      points,
      Math.max(5, 8 * camera.zoom),
      rgba(color, (0.07 + powered * 0.13) * flicker),
      'rgba(2, 15, 24, .72)',
      rgba(color, 0.16 + powered * 0.3),
      1
    );
    const center = projectWorldPoint(district, camera, viewport);
    context.save();
    context.fillStyle = rgba(color, 0.42 + powered * 0.46);
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
      context.save();
      context.lineCap = 'round';
      context.strokeStyle = link.active
        ? rgba(accent, 0.22 + link.intensity * 0.38)
        : 'rgba(88, 112, 126, .1)';
      context.lineWidth = link.active ? 1.4 + link.intensity * 1.3 : 1;
      context.setLineDash(link.active ? [8, 7] : [3, 8]);
      context.lineDashOffset = link.active ? -now / 55 : 0;
      context.beginPath();
      context.moveTo(from.x, from.y);
      const controlX = (from.x + to.x) / 2;
      const controlY = Math.min(from.y, to.y) - 18 * camera.zoom;
      context.quadraticCurveTo(controlX, controlY, to.x, to.y);
      context.stroke();
      if (link.active) {
        const t = (now / 1800 + index * 0.23) % 1;
        const inverse = 1 - t;
        const x = inverse * inverse * from.x + 2 * inverse * t * controlX + t * t * to.x;
        const y = inverse * inverse * from.y + 2 * inverse * t * controlY + t * t * to.y;
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
    context.strokeStyle = rgba(accent, 0.58);
    context.lineWidth = 2;
    context.setLineDash([10, 8]);
    context.lineDashOffset = -now / 70;
    context.beginPath();
    context.ellipse(0, 8, 78 * camera.zoom, 31 * camera.zoom, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = rgba(accent, 0.075);
    context.fill();
    context.restore();

    drawIsoBox(
      context,
      center.x,
      center.y + 5 * camera.zoom,
      88 * camera.zoom,
      34 * camera.zoom,
      8 * camera.zoom,
      rgba(accent, 0.2),
      'rgba(7, 34, 47, .95)',
      'rgba(4, 25, 36, .98)',
      rgba(accent, 0.76)
    );

    const towers = [
      { x: -38, w: 19, h: 56 },
      { x: -16, w: 23, h: 82 },
      { x: 10, w: 25, h: 108 },
      { x: 37, w: 18, h: 68 }
    ];
    for (const [towerIndex, tower] of towers.entries()) {
      const width = tower.w * camera.zoom;
      const height = tower.h * camera.zoom;
      const x = center.x + tower.x * camera.zoom;
      const groundY = center.y - 2 * camera.zoom;
      drawIsoBox(
        context,
        x,
        groundY,
        width,
        width * 0.42,
        height,
        rgba(accent, 0.52 + towerIndex * 0.04),
        'rgba(9, 44, 60, .96)',
        'rgba(5, 31, 45, .98)',
        rgba(accent, 0.78)
      );
      const floors = Math.max(3, Math.round(tower.h / 11));
      context.save();
      for (let floor = 0; floor < floors; floor += 1) {
        const lit = state.supplyRatio > floor / floors * 0.7;
        context.fillStyle = lit && night
          ? 'rgba(255, 222, 117, .9)'
          : rgba(accent, lit ? 0.55 : 0.15);
        context.fillRect(
          x - width * 0.24,
          groundY - height * (0.16 + floor / floors * 0.68),
          Math.max(1.5, width * 0.09),
          Math.max(1.5, height * 0.035)
        );
        context.fillRect(
          x + width * 0.12,
          groundY - height * (0.16 + floor / floors * 0.68),
          Math.max(1.5, width * 0.09),
          Math.max(1.5, height * 0.035)
        );
      }
      context.restore();
    }

    drawTextChip(
      context,
      center,
      state.cityName,
      `${state.population.toLocaleString('zh-CN')} 位居民 · ${Math.round(state.supplyRatio * 100)}% 街区亮灯`,
      accent,
      34 * camera.zoom
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
    const points = getDiamondPoints(plot, 5.8 * plot.scale, 4.5 * plot.scale, camera, viewport);
    const hitId = facility?.instanceId ?? plot.id;
    const isHovered = hovered?.id === hitId;
    const pulse = 0.5 + Math.sin(now / 240) * 0.28;
    drawExtrudedDiamond(
      context,
      points,
      Math.max(4, 6 * camera.zoom),
      plot.blocked
        ? 'rgba(25, 30, 35, .24)'
        : rgba(color, plot.available ? 0.2 + pulse * 0.16 : plot.occupied ? 0.14 : 0.06),
      'rgba(1, 12, 20, .82)',
      plot.blocked
        ? 'rgba(91, 108, 119, .18)'
        : rgba(color, plot.available ? 0.75 + pulse * 0.2 : isHovered ? 0.9 : 0.3),
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
    const { context, camera, now, constructionStartedAt } = input;
    const startedAt = constructionStartedAt.get(facility.instanceId);
    const progress = startedAt === undefined ? 1 : easeOutCubic((now - startedAt) / 1250);
    const size = clamp(92 * facility.scale * camera.zoom, 58, 152);
    this.facilityModels.draw({
      context,
      facility,
      center,
      size,
      accent: color,
      now,
      progress,
      zoom: camera.zoom
    });

    if (hovered) {
      const detail = facility.category === 'storage'
        ? `备用电 ${Math.round(facility.storageRatio * 100)}% · ${facility.enabled ? '运行中' : '已关闭'}`
        : `供电 ${Math.round(facility.output)} MW · ${facility.enabled ? '运行中' : '已关闭'}`;
      drawTextChip(context, center, `${facility.name} · ${facility.level}级`, detail, color, 18 * camera.zoom);
    }
  }

  private drawPlacementHint(input: HologramRenderInput, accent: Rgb): void {
    const placement = input.state.placement;
    if (!placement) return;
    const { context, viewport, now } = input;
    context.save();
    const pulse = 0.55 + Math.sin(now / 280) * 0.18;
    context.fillStyle = 'rgba(2, 16, 28, .82)';
    context.strokeStyle = rgba(accent, pulse);
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(viewport.width * 0.5 - 150, 16, 300, 42, 12);
    context.fill();
    context.stroke();
    context.fillStyle = '#edfaff';
    context.font = '700 12px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(`正在建设：${placement.buildingName}`, viewport.width * 0.5, 34);
    context.fillStyle = 'rgba(181, 219, 235, .76)';
    context.font = '10px system-ui, sans-serif';
    context.fillText(`${placement.validPlotIds.length} 块用地可选`, viewport.width * 0.5, 49);
    context.restore();
  }

  private drawScanSweep(
    context: CanvasRenderingContext2D,
    viewport: HologramViewport,
    camera: SandboxCameraState,
    accent: Rgb,
    now: number
  ): void {
    const progress = (now / 5200) % 1;
    const y = viewport.height * (0.2 + progress * 0.62) + camera.offsetY * 0.25;
    const gradient = context.createLinearGradient(0, y - 22, 0, y + 22);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, rgba(accent, 0.14));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(viewport.width * 0.06, y - 22, viewport.width * 0.88, 44);
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
    const status = state.blackoutIntensity > 0.35 ? 'BLACKOUT RESPONSE' : 'CITY ONLINE';
    context.fillText(`${status} · DAY ${state.day} · ${String(Math.floor(state.hour)).padStart(2, '0')}:00`, viewport.width - 18, viewport.height - 18);
    context.restore();
  }
}
