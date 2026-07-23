import { stableVisualHash } from '../../presentation/CitySceneVisuals';
import { WorldVisualRegistry } from '../../presentation/visuals/WorldVisualRegistry';
import type { HologramRenderInput } from './HologramCityRenderer';
import { projectWorldPoint, type ScreenPoint } from './HologramGeometry';
import {
  drawCenteredSprite,
  drawGroundedSprite,
  isDrawableImage
} from './WorldSpriteDrawing';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const pointAlongPolyline = (points: readonly ScreenPoint[], progress: number): ScreenPoint => {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0] ?? { x: 0, y: 0 };

  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    lengths.push(length);
    total += length;
  }
  if (total <= 0) return points[0] ?? { x: 0, y: 0 };

  let remaining = clamp(progress, 0, 1) * total;
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

export class AssetCityLifeRenderer {
  render(input: HologramRenderInput): void {
    this.drawRoads(input);
    this.drawAmbientBlocks(input);
    this.drawTraffic(input);
    this.drawDistrictEffects(input);
  }

  private drawRoads(input: HologramRenderInput): void {
    const { context, camera, viewport, state } = input;
    const tileSize = clamp(76 * camera.zoom, 48, 108);
    const spacing = Math.max(28, tileSize * 0.46);

    for (const road of state.roads) {
      const points = road.points.map((point) => projectWorldPoint(point, camera, viewport));
      for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        if (!from || !to) continue;
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const samples = Math.max(1, Math.ceil(length / spacing));
        const direction = WorldVisualRegistry.resolveRoadDirection(from, to);
        const image = input.resolveImage(WorldVisualRegistry.resolveRoad(road, direction));
        if (!isDrawableImage(image)) continue;

        for (let sample = 0; sample < samples; sample += 1) {
          const ratio = (sample + 0.5) / samples;
          drawGroundedSprite(
            context,
            image,
            {
              x: from.x + (to.x - from.x) * ratio,
              y: from.y + (to.y - from.y) * ratio
            },
            tileSize,
            {
              groundRatio: 0.535,
              alpha: road.powered ? 0.92 : 0.54
            }
          );
        }
      }
    }
  }

  private drawAmbientBlocks(input: HologramRenderInput): void {
    const { context, camera, viewport, state } = input;
    const ordered = [...state.ambientBlocks]
      .sort((left, right) => left.x + left.z - right.x - right.z);

    for (const block of ordered) {
      const center = projectWorldPoint(block, camera, viewport);
      const visual = WorldVisualRegistry.resolveAmbientBlock(block, state.hour);
      if (visual.decorationAssetIds) {
        this.drawParkDecorations(input, center, block.lightSeed, visual.decorationAssetIds);
        continue;
      }

      const body = visual.bodyAssetId ? input.resolveImage(visual.bodyAssetId) : undefined;
      if (!isDrawableImage(body)) continue;
      const size = clamp((106 + block.height * 5.2) * camera.zoom, 94, 236);
      const shadow = visual.shadowAssetId ? input.resolveImage(visual.shadowAssetId) : undefined;
      if (isDrawableImage(shadow)) {
        drawGroundedSprite(context, shadow, center, size, {
          groundRatio: 0.79,
          alpha: 0.5
        });
      }
      drawGroundedSprite(context, body, center, size, {
        groundRatio: 0.79,
        alpha: 0.78 + block.powerRatio * 0.22
      });
    }
  }

  private drawParkDecorations(
    input: HologramRenderInput,
    center: ScreenPoint,
    seed: number,
    assetIds: readonly string[]
  ): void {
    const { context, camera } = input;
    const offsets = [
      { x: -18, y: 2 },
      { x: 14, y: -4 },
      { x: 0, y: 10 }
    ];
    assetIds.forEach((assetId, index) => {
      const image = input.resolveImage(assetId);
      if (!isDrawableImage(image)) return;
      const offset = offsets[index] ?? { x: 0, y: 0 };
      const scaleJitter = 0.88 + (stableVisualHash(`${seed}:${index}`) % 18) / 100;
      drawGroundedSprite(
        context,
        image,
        {
          x: center.x + offset.x * camera.zoom,
          y: center.y + offset.y * camera.zoom
        },
        clamp(62 * camera.zoom * scaleJitter, 42, 88),
        { groundRatio: 0.8, alpha: 0.9 }
      );
    });
  }

  private drawTraffic(input: HologramRenderInput): void {
    const { context, camera, viewport, state, now } = input;
    for (const road of state.roads) {
      const points = road.points.map((point) => projectWorldPoint(point, camera, viewport));
      if (points.length < 2) continue;
      const vehicleCount = Math.max(
        0,
        Math.round(road.traffic * state.trafficDensity * (road.laneCount === 2 ? 3 : 2))
      );
      for (let index = 0; index < vehicleCount; index += 1) {
        const seed = stableVisualHash(`${road.id}:${index}`);
        const travelSign = seed % 2 === 0 ? 1 : -1;
        const duration = Math.max(2800, 6600 - road.traffic * 2600);
        const raw = (now / duration + index / Math.max(1, vehicleCount) + (seed % 100) / 100) % 1;
        const progress = travelSign === 1 ? raw : 1 - raw;
        const position = pointAlongPolyline(points, progress);
        const ahead = pointAlongPolyline(points, clamp(progress + 0.018 * travelSign, 0, 1));
        const direction = WorldVisualRegistry.resolveVehicleDirection(position, ahead);
        const image = input.resolveImage(WorldVisualRegistry.resolveVehicle(seed, direction));
        if (!isDrawableImage(image)) continue;

        drawGroundedSprite(
          context,
          image,
          { x: position.x, y: position.y - 1.5 * camera.zoom },
          clamp(38 * camera.zoom, 27, 54),
          {
            groundRatio: 0.68,
            alpha: road.powered ? 0.94 : 0.48
          }
        );
      }
    }
  }

  private drawDistrictEffects(input: HologramRenderInput): void {
    const { context, camera, viewport, state, now } = input;
    for (const district of state.districts) {
      const assetId = WorldVisualRegistry.resolveDistrictEffect(
        district.powerRatio,
        district.demandIntensity
      );
      if (!assetId) continue;
      const image = input.resolveImage(assetId);
      if (!isDrawableImage(image)) continue;
      const center = projectWorldPoint(district, camera, viewport);
      const pulse = 0.44 + Math.sin(now / 430 + district.x) * 0.08;
      drawCenteredSprite(
        context,
        image,
        center,
        clamp(district.radiusX * 8.2 * camera.zoom, 92, 230),
        clamp(district.radiusZ * 5.1 * camera.zoom, 58, 150),
        { alpha: pulse, composite: 'lighter' }
      );
    }
  }
}