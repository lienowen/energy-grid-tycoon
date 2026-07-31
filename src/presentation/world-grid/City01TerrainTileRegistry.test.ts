import { describe, expect, it } from 'vitest';
import atlasData from '../../../source/city01/terrain-tileset-v1/atlas/terrain_coast_v1.json';
import {
  CITY01_VALID_COAST_MASKS,
  normalizeCity01CoastMask,
  resolveCity01TerrainFrame,
  resolveCity01WaterFrame
} from './City01TerrainTileRegistry';

const atlasFrames = atlasData.frames as Record<string, unknown>;

describe('City01TerrainTileRegistry', () => {
  it('normalizes all 256 raw masks to exactly 47 legal coast masks', () => {
    const normalized = new Set(
      Array.from({ length: 256 }, (_, mask) => normalizeCity01CoastMask(mask))
    );

    expect(normalized.size).toBe(47);
    expect([...normalized].sort((left, right) => left - right)).toEqual([
      ...CITY01_VALID_COAST_MASKS
    ]);
  });

  it('resolves every legal coast mask to an atlas frame', () => {
    for (const mask of CITY01_VALID_COAST_MASKS) {
      const frameName = mask === 0
        ? resolveCity01TerrainFrame(mask, 0)
        : `terrain_coast_mask_${String(mask).padStart(3, '0')}`;
      expect(atlasFrames[frameName], frameName).toBeDefined();
    }
  });

  it('uses stable center frames at runtime to avoid per-cell checkerboards', () => {
    for (let variation = 0; variation < 8; variation += 1) {
      expect(resolveCity01TerrainFrame(0, variation)).toBe('terrain_grass_00');
      expect(resolveCity01WaterFrame(variation)).toBe('terrain_water_00');
    }
    expect(atlasFrames.terrain_grass_00).toBeDefined();
    expect(atlasFrames.terrain_water_00).toBeDefined();
  });
});
