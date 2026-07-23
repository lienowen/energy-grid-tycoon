import { WorldVisualRegistry } from '../../presentation/visuals/WorldVisualRegistry';
import type { HologramRenderInput } from './HologramCityRenderer';
import { projectWorldPoint, type ScreenPoint } from './HologramGeometry';
import {
  drawCenteredSprite,
  drawGroundedSprite,
  isDrawableImage
} from './WorldSpriteDrawing';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

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

export class AssetFeedbackRenderer {
  render(input: HologramRenderInput): void {
    this.drawExpansionSites(input);
    this.drawConstructionConvoys(input);
    this.drawCitizenFeedback(input);
  }

  private drawExpansionSites(input: HologramRenderInput): void {
    const image = input.resolveImage('world_effect_construction');
    if (!isDrawableImage(image)) return;

    for (const site of input.state.expansionSites ?? []) {
      const center = projectWorldPoint(site, input.camera, input.viewport);
      const pulse = 0.5 + Math.sin(input.now / 480 + site.x) * 0.08;
      drawCenteredSprite(
        input.context,
        image,
        {
          x: center.x,
          y: center.y - 19 * input.camera.zoom
        },
        Math.max(44, 68 * site.scale * input.camera.zoom),
        undefined,
        { alpha: pulse, composite: 'lighter' }
      );
    }
  }

  private drawConstructionConvoys(input: HologramRenderInput): void {
    const { state, camera, viewport, now } = input;
    const city = projectWorldPoint(state.city, camera, viewport);
    for (const [facilityId, startedAt] of input.constructionStartedAt) {
      const facility = state.facilities.find((item) => item.instanceId === facilityId);
      if (!facility) continue;
      const progress = clamp01((now - startedAt) / 1050);
      const target = projectWorldPoint(facility, camera, viewport);
      const control = {
        x: (city.x + target.x) / 2,
        y: Math.max(city.y, target.y) + 34 * camera.zoom
      };
      const position = quadraticPoint(city, control, target, clamp01(progress * 1.18));
      const ahead = quadraticPoint(city, control, target, clamp01(progress * 1.18 + 0.025));
      const direction = WorldVisualRegistry.resolveVehicleDirection(position, ahead);
      const image = input.resolveImage(`world_vehicle_truck_${direction}`);
      if (!isDrawableImage(image)) continue;
      drawGroundedSprite(
        input.context,
        image,
        position,
        Math.max(34, 44 * camera.zoom),
        {
          groundRatio: 0.68,
          alpha: Math.max(0.2, 1 - progress * 0.35)
        }
      );
    }
  }

  private drawCitizenFeedback(input: HologramRenderInput): void {
    for (const feedback of input.state.citizenFeedback ?? []) {
      const cycle = (input.now / 6200 + feedback.phase) % 1;
      const fade = cycle < 0.12 ? cycle / 0.12 : cycle > 0.84 ? (1 - cycle) / 0.16 : 1;
      if (fade <= 0.04) continue;
      const image = input.resolveImage(WorldVisualRegistry.resolveCitizenEffect(feedback.tone));
      if (!isDrawableImage(image)) continue;
      const anchor = projectWorldPoint(feedback, input.camera, input.viewport);
      const bob = Math.sin(input.now / 520 + feedback.phase * Math.PI * 2) * 4;
      drawCenteredSprite(
        input.context,
        image,
        {
          x: anchor.x - 58,
          y: anchor.y - 47 * input.camera.zoom + bob
        },
        30,
        30,
        {
          alpha: fade * 0.92,
          composite: feedback.tone === 'positive' ? 'lighter' : undefined
        }
      );
    }
  }
}