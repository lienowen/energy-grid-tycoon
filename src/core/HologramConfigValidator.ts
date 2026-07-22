import type { LevelConfig } from '../systems/LevelLoader';

const finiteInRange = (value: number | undefined, min: number, max: number): boolean =>
  value === undefined || (Number.isFinite(value) && value >= min && value <= max);

export class HologramConfigValidator {
  static assertValid(levels: readonly LevelConfig[]): void {
    const errors: string[] = [];

    for (const level of levels) {
      const world = level.presentation?.world;
      if (!world) continue;
      const prefix = `Level ${level.id} hologram`;
      const sandbox = world.sandbox;

      if (sandbox) {
        if (!finiteInRange(sandbox.startZoom, 0.55, 2.4)) errors.push(`${prefix} startZoom is outside 0.55–2.4`);
        if (!finiteInRange(sandbox.minZoom, 0.45, 1.5)) errors.push(`${prefix} minZoom is outside 0.45–1.5`);
        if (!finiteInRange(sandbox.maxZoom, 1, 3)) errors.push(`${prefix} maxZoom is outside 1–3`);
        const minZoom = sandbox.minZoom ?? 0.72;
        const maxZoom = sandbox.maxZoom ?? 1.75;
        const startZoom = sandbox.startZoom ?? 1;
        if (minZoom >= maxZoom) errors.push(`${prefix} minZoom must be lower than maxZoom`);
        if (startZoom < minZoom || startZoom > maxZoom) errors.push(`${prefix} startZoom must be inside the zoom range`);
        if (!finiteInRange(sandbox.startOffsetX, -600, 600)) errors.push(`${prefix} startOffsetX is outside the supported range`);
        if (!finiteInRange(sandbox.startOffsetY, -400, 400)) errors.push(`${prefix} startOffsetY is outside the supported range`);
      }

      if (world.city?.elevation !== undefined && !finiteInRange(world.city.elevation, -4, 12)) {
        errors.push(`${prefix} city elevation is outside -4–12`);
      }

      for (const plot of world.plots ?? []) {
        if (!finiteInRange(plot.elevation, -4, 12)) errors.push(`${prefix} plot ${plot.id} has invalid elevation`);
        if (plot.footprint) {
          if (!finiteInRange(plot.footprint.width, 2, 30)) errors.push(`${prefix} plot ${plot.id} has invalid footprint width`);
          if (!finiteInRange(plot.footprint.height, 2, 30)) errors.push(`${prefix} plot ${plot.id} has invalid footprint height`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid hologram configuration:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    }
  }
}
