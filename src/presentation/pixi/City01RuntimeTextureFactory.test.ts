import { describe, expect, it } from 'vitest';
import {
  city01RuntimeTextureKind,
  isCity01WaterPixel,
  matchCity01WaterColor
} from './City01RuntimeTextureFactory';

describe('City01RuntimeTextureFactory', () => {
  it('routes coast blending and connector cropping deterministically', () => {
    expect(city01RuntimeTextureKind('terrain_beach_open_base')).toBe('coast-blend');
    expect(city01RuntimeTextureKind('terrain_road_bridge_base')).toBe('coast-blend');
    expect(city01RuntimeTextureKind('city01_road_connector_short')).toBe('road-crop');
    expect(city01RuntimeTextureKind('terrain_forest_base')).toBeUndefined();
  });

  it('identifies saturated cyan water while preserving land and white foam', () => {
    expect(isCity01WaterPixel(22, 143, 176, 255)).toBe(true);
    expect(isCity01WaterPixel(185, 166, 118, 255)).toBe(false);
    expect(isCity01WaterPixel(238, 244, 238, 255)).toBe(false);
    expect(isCity01WaterPixel(20, 140, 170, 0)).toBe(false);
  });

  it('matches coast water to the common ocean without deleting authored waves', () => {
    const matched = matchCity01WaterColor(22, 143, 176, 255);
    expect(matched[0]).toBeLessThan(30);
    expect(matched[1]).toBeGreaterThanOrEqual(60);
    expect(matched[2]).toBeGreaterThan(matched[1]);
    expect(matched[3]).toBeGreaterThan(220);
    expect(matchCity01WaterColor(185, 166, 118, 255)).toEqual([185, 166, 118, 255]);
  });
});
