import { describe, expect, it } from 'vitest';
import levelData from '../data/levels.json';
import type { LevelConfig } from '../systems/LevelLoader';
import { HologramConfigValidator } from './HologramConfigValidator';

describe('HologramConfigValidator', () => {
  it('accepts the production city maps', () => {
    expect(() => HologramConfigValidator.assertValid(levelData as unknown as LevelConfig[])).not.toThrow();
  });

  it('rejects a camera start zoom outside its range', () => {
    const level = structuredClone(levelData[0]) as unknown as LevelConfig;
    const world = level.presentation?.world;
    if (!world) throw new Error('fixture has no world presentation');
    world.sandbox = { minZoom: 0.8, maxZoom: 1.2, startZoom: 1.8 };
    expect(() => HologramConfigValidator.assertValid([level])).toThrow('startZoom must be inside the zoom range');
  });

  it('rejects invalid 3D plot footprints', () => {
    const level = structuredClone(levelData[0]) as unknown as LevelConfig;
    const plot = level.presentation?.world?.plots?.[0];
    if (!plot) throw new Error('fixture has no city plot');
    plot.footprint = { width: 0, height: 8 };
    expect(() => HologramConfigValidator.assertValid([level])).toThrow('invalid footprint width');
  });
});
