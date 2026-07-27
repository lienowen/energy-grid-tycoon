import { describe, expect, it } from 'vitest';
import {
  city01RuntimeTextureKind,
  isCity01WaterPixel
} from './City01RuntimeTextureFactory';

describe('City01RuntimeTextureFactory', () => {
  it('routes coast and connector assets to deterministic runtime cuts', () => {
    expect(city01RuntimeTextureKind('terrain_beach_open_base')).toBe('coast-cutout');
    expect(city01RuntimeTextureKind('terrain_road_bridge_base')).toBe('coast-cutout');
    expect(city01RuntimeTextureKind('city01_road_connector_short')).toBe('road-crop');
    expect(city01RuntimeTextureKind('terrain_forest_base')).toBeUndefined();
  });

  it('removes saturated cyan water while preserving land and white foam', () => {
    expect(isCity01WaterPixel(22, 143, 176, 255)).toBe(true);
    expect(isCity01WaterPixel(185, 166, 118, 255)).toBe(false);
    expect(isCity01WaterPixel(238, 244, 238, 255)).toBe(false);
    expect(isCity01WaterPixel(20, 140, 170, 0)).toBe(false);
  });
});
