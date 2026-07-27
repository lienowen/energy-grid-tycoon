import { describe, expect, it } from 'vitest';
import { shouldGenerateCity01DistrictTexture } from './City01DistrictTextureFactory';

describe('City01DistrictTextureFactory', () => {
  it('only post-processes the City-01 residential runtime states', () => {
    expect(shouldGenerateCity01DistrictTexture('commercial_district_residential_night')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_residential_blackout')).toBe(true);
    expect(shouldGenerateCity01DistrictTexture('commercial_district_commercial_night')).toBe(false);
    expect(shouldGenerateCity01DistrictTexture('world_building_res_tower_a_night')).toBe(false);
  });
});
