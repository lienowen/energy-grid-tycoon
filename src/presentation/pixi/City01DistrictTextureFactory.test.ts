import { describe, expect, it } from 'vitest';
import {
  isCity01VegetationPixel,
  shouldGenerateCity01DistrictTexture
} from './City01DistrictTextureFactory';

describe('City01DistrictTextureFactory', () => {
  it('post-processes only the approved City-01 district runtime states', () => {
    expect(shouldGenerateCity01DistrictTexture('commercial_district_residential_night')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_residential_blackout')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_commercial_night')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_commercial_blackout')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_industrial_night')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_industrial_blackout')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_public_night')).toBe(false);
    expect(shouldGenerateCity01DistrictTexture('world_building_res_tower_a_night')).toBe(false);
  });

  it('keeps vegetation while excluding neutral road and transparent pixels', () => {
    expect(isCity01VegetationPixel(45, 118, 62, 255)).toBe(true);
    expect(isCity01VegetationPixel(72, 82, 88, 255)).toBe(false);
    expect(isCity01VegetationPixel(240, 236, 220, 255)).toBe(false);
    expect(isCity01VegetationPixel(45, 118, 62, 0)).toBe(false);
  });
});
