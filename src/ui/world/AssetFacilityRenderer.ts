import { FacilityVisualRegistry } from '../../presentation/visuals/FacilityVisualRegistry';
import type { HologramRenderInput } from './HologramCityRenderer';
import { projectWorldPoint } from './HologramGeometry';
import {
  drawGroundedSprite,
  isDrawableImage
} from './WorldSpriteDrawing';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const easeOutCubic = (value: number): number => {
  const progress = clamp(value, 0, 1);
  return 1 - Math.pow(1 - progress, 3);
};

export class AssetFacilityRenderer {
  render(input: HologramRenderInput): void {
    const ordered = [...input.state.facilities]
      .sort((left, right) => left.x + left.z - right.x - right.z);

    for (const facility of ordered) {
      const center = projectWorldPoint(facility, input.camera, input.viewport);
      const startedAt = input.constructionStartedAt.get(facility.instanceId);
      const progress = startedAt === undefined
        ? 1
        : easeOutCubic((input.now - startedAt) / 1250);
      const selected = input.hovered?.kind === 'facility'
        && input.hovered.id === facility.instanceId;
      const visual = FacilityVisualRegistry.resolve({
        configId: facility.configId,
        category: facility.category,
        enabled: facility.enabled,
        selected,
        constructionProgress: progress
      });
      const body = input.resolveImage(visual.bodyAssetId);
      if (!isDrawableImage(body)) continue;

      const size = clamp(178 * facility.scale * input.camera.zoom, 116, 264);
      const rise = (1 - progress) * size * 0.18;
      const shadow = input.resolveImage(visual.shadowAssetId);
      const light = visual.lightAssetId ? input.resolveImage(visual.lightAssetId) : undefined;
      const motion = visual.motionAssetId ? input.resolveImage(visual.motionAssetId) : undefined;
      const effect = visual.effectAssetId ? input.resolveImage(visual.effectAssetId) : undefined;
      const alpha = facility.enabled ? 1 : 0.72;

      if (isDrawableImage(shadow)) {
        drawGroundedSprite(
          input.context,
          shadow,
          { x: center.x, y: center.y + size * 0.02 },
          size,
          { alpha: alpha * 0.72 }
        );
      }
      drawGroundedSprite(input.context, body, center, size, { rise, alpha });

      if (isDrawableImage(light)) {
        drawGroundedSprite(
          input.context,
          light,
          center,
          size * 0.62,
          {
            rise: rise + size * 0.08,
            alpha: 0.34 + Math.sin(input.now / 420) * 0.08,
            composite: 'lighter'
          }
        );
      }
      if (isDrawableImage(motion)) {
        input.context.save();
        input.context.globalCompositeOperation = 'lighter';
        input.context.globalAlpha = 0.18;
        input.context.translate(center.x, center.y - size * 0.36 - rise);
        input.context.rotate(input.now / 1600);
        input.context.drawImage(motion, -size * 0.24, -size * 0.24, size * 0.48, size * 0.48);
        input.context.restore();
      }
      if (isDrawableImage(effect)) {
        drawGroundedSprite(
          input.context,
          effect,
          center,
          size * 0.58,
          {
            rise: rise + size * 0.05,
            alpha: 0.16 + Math.sin(input.now / 530) * 0.04,
            composite: 'lighter'
          }
        );
      }
    }
  }
}