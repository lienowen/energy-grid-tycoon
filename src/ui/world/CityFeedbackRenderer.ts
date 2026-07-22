import type {
  CitizenFeedbackSceneState,
  ExpansionSiteSceneState
} from '../../presentation/CitySceneTypes';
import {
  getDiamondPoints,
  projectWorldPoint,
  type ScreenPoint
} from './HologramGeometry';
import type { HologramRenderInput } from './HologramCityRenderer';
import {
  clamp01,
  drawIsoBox,
  parseHex,
  rgba,
  type Rgb
} from './HologramDrawing';

const toneColors: Record<CitizenFeedbackSceneState['tone'], Rgb> = {
  positive: [92, 225, 163],
  neutral: [74, 215, 255],
  warning: [255, 202, 107],
  danger: [255, 116, 133]
};

const quadraticPoint = (
  from: ScreenPoint,
  control: ScreenPoint,
  to: ScreenPoint,
  progress: number
): ScreenPoint => {
  const t = clamp01(progress);
  const inverse = 1 - t;
  return {
    x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
    y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y
  };
};

export class CityFeedbackRenderer {
  render(input: HologramRenderInput): void {
    this.drawDemandHeat(input);
    this.drawExpansionSites(input);
    this.drawConstructionConvoys(input);
    this.drawCitizenFeedback(input);
    this.drawGrowthBadge(input);
  }

  private drawDemandHeat(input: HologramRenderInput): void {
    const { context, viewport, camera, state, now } = input;
    for (const district of state.districts) {
      const demandIntensity = district.demandIntensity ?? 0;
      const pressure = clamp01(
        demandIntensity * 0.66
        + Math.max(0, demandIntensity - district.powerRatio) * 0.72
      );
      if (pressure < 0.38) continue;
      const points = getDiamondPoints(
        { ...district, elevation: district.elevation + 0.08 },
        district.radiusX * 0.92,
        district.radiusZ * 0.92,
        camera,
        viewport
      );
      const first = points[0];
      if (!first) continue;
      const hot: Rgb = pressure > 0.76 ? [255, 116, 133] : [255, 202, 107];
      const pulse = 0.72 + Math.sin(now / 420 + district.x) * 0.18;
      context.save();
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (const point of points.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = rgba(hot, pressure * 0.055 * pulse);
      context.shadowColor = rgba(hot, pressure * 0.38);
      context.shadowBlur = 18;
      context.fill();
      context.setLineDash([4, 8]);
      context.lineDashOffset = -now / 90;
      context.strokeStyle = rgba(hot, pressure * 0.35);
      context.lineWidth = Math.max(1, camera.zoom);
      context.stroke();
      context.restore();
    }
  }

  private drawExpansionSites(input: HologramRenderInput): void {
    const { context, state, now } = input;
    const accent = parseHex(state.accent);
    for (const site of state.expansionSites ?? []) {
      this.drawExpansionSite(context, site, input, accent, now);
    }
  }

  private drawExpansionSite(
    context: CanvasRenderingContext2D,
    site: ExpansionSiteSceneState,
    input: HologramRenderInput,
    accent: Rgb,
    now: number
  ): void {
    const center = projectWorldPoint(site, input.camera, input.viewport);
    const size = 28 * site.scale * input.camera.zoom;
    const progress = clamp01(site.progress);
    drawIsoBox(
      context,
      center.x,
      center.y,
      size,
      size * 0.42,
      4 * input.camera.zoom,
      rgba(accent, 0.16 + progress * 0.12),
      'rgba(4, 25, 35, .92)',
      'rgba(2, 18, 28, .96)',
      rgba(accent, 0.52)
    );

    const craneHeight = size * (0.8 + progress * 0.5);
    context.save();
    context.strokeStyle = 'rgba(255, 202, 107, .9)';
    context.lineWidth = Math.max(1.5, input.camera.zoom * 1.5);
    context.beginPath();
    context.moveTo(center.x - size * 0.18, center.y - 2);
    context.lineTo(center.x - size * 0.18, center.y - craneHeight);
    context.lineTo(center.x + size * 0.35, center.y - craneHeight);
    context.stroke();
    const hook = (Math.sin(now / 650 + site.x) * 0.5 + 0.5) * size * 0.26;
    context.beginPath();
    context.moveTo(center.x + size * 0.18, center.y - craneHeight);
    context.lineTo(center.x + size * 0.18, center.y - craneHeight + size * 0.2 + hook);
    context.stroke();
    context.fillStyle = 'rgba(255, 202, 107, .92)';
    context.fillRect(
      center.x + size * 0.15,
      center.y - craneHeight + size * 0.17 + hook,
      size * 0.06,
      size * 0.05
    );
    context.fillStyle = 'rgba(232, 247, 255, .78)';
    context.font = `700 ${Math.max(9, 10 * input.camera.zoom)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.fillText(site.label, center.x, center.y + size * 0.42);
    context.restore();
  }

  private drawConstructionConvoys(input: HologramRenderInput): void {
    const { context, viewport, camera, state, now, constructionStartedAt } = input;
    const accent = parseHex(state.accent);
    const city = projectWorldPoint(state.city, camera, viewport);
    for (const [facilityId, startedAt] of constructionStartedAt) {
      const facility = state.facilities.find((item) => item.instanceId === facilityId);
      if (!facility) continue;
      const elapsed = now - startedAt;
      const progress = clamp01(elapsed / 1050);
      const target = projectWorldPoint(facility, camera, viewport);
      const control = {
        x: (city.x + target.x) / 2,
        y: Math.max(city.y, target.y) + 34 * camera.zoom
      };
      const truckProgress = clamp01(progress * 1.18);
      const position = quadraticPoint(city, control, target, truckProgress);
      const ahead = quadraticPoint(city, control, target, Math.min(1, truckProgress + 0.02));
      const angle = Math.atan2(ahead.y - position.y, ahead.x - position.x);

      context.save();
      context.strokeStyle = rgba(accent, 0.18 * (1 - progress));
      context.lineWidth = Math.max(1, camera.zoom);
      context.setLineDash([5, 8]);
      context.lineDashOffset = -now / 80;
      context.beginPath();
      context.moveTo(city.x, city.y);
      context.quadraticCurveTo(control.x, control.y, target.x, target.y);
      context.stroke();

      context.translate(position.x, position.y);
      context.rotate(angle);
      context.shadowColor = 'rgba(255, 202, 107, .86)';
      context.shadowBlur = 9;
      context.fillStyle = '#ffca6b';
      context.fillRect(-6 * camera.zoom, -3 * camera.zoom, 12 * camera.zoom, 6 * camera.zoom);
      context.fillStyle = '#dff7ff';
      context.fillRect(1 * camera.zoom, -2.3 * camera.zoom, 3.5 * camera.zoom, 4.6 * camera.zoom);
      context.fillStyle = '#061924';
      context.beginPath();
      context.arc(-3.5 * camera.zoom, 3.2 * camera.zoom, 1.6 * camera.zoom, 0, Math.PI * 2);
      context.arc(3.5 * camera.zoom, 3.2 * camera.zoom, 1.6 * camera.zoom, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  private drawCitizenFeedback(input: HologramRenderInput): void {
    const { state, now } = input;
    for (const feedback of state.citizenFeedback ?? []) {
      const cycle = (now / 6200 + feedback.phase) % 1;
      const fade = cycle < 0.12 ? cycle / 0.12 : cycle > 0.84 ? (1 - cycle) / 0.16 : 1;
      if (fade <= 0.04) continue;
      this.drawCitizenBubble(input.context, feedback, input, fade);
    }
  }

  private drawCitizenBubble(
    context: CanvasRenderingContext2D,
    feedback: CitizenFeedbackSceneState,
    input: HologramRenderInput,
    fade: number
  ): void {
    const anchor = projectWorldPoint(feedback, input.camera, input.viewport);
    const accent = toneColors[feedback.tone];
    const width = Math.max(116, Math.min(196, feedback.message.length * 13 + 26));
    const height = 38;
    const bob = Math.sin(input.now / 520 + feedback.phase * Math.PI * 2) * 4;
    const x = anchor.x - width / 2;
    const y = anchor.y - 62 * input.camera.zoom + bob;
    context.save();
    context.globalAlpha = fade;
    context.fillStyle = 'rgba(3, 18, 29, .91)';
    context.strokeStyle = rgba(accent, 0.72);
    context.lineWidth = 1.2;
    context.beginPath();
    context.roundRect(x, y, width, height, 11);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(anchor.x - 7, y + height);
    context.lineTo(anchor.x, y + height + 8);
    context.lineTo(anchor.x + 7, y + height);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = '#effaff';
    context.font = '700 12px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(feedback.message, anchor.x, y + 24, width - 18);
    context.restore();
  }

  private drawGrowthBadge(input: HologramRenderInput): void {
    const { context, viewport, state } = input;
    const growth = state.growth ?? { stage: 1 as const, progress: 0, label: '城市起步' };
    const accent = parseHex(state.accent);
    const width = 154;
    const x = 18;
    const y = viewport.height - 54;
    context.save();
    context.fillStyle = 'rgba(2, 16, 27, .78)';
    context.strokeStyle = rgba(accent, 0.32);
    context.beginPath();
    context.roundRect(x, y, width, 34, 10);
    context.fill();
    context.stroke();
    context.fillStyle = '#eaf8ff';
    context.font = '700 11px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(growth.label, x + 12, y + 14);
    context.fillStyle = 'rgba(112, 149, 167, .45)';
    context.fillRect(x + 12, y + 22, width - 24, 4);
    context.fillStyle = rgba(accent, 0.9);
    context.fillRect(x + 12, y + 22, (width - 24) * growth.progress, 4);
    context.restore();
  }
}
