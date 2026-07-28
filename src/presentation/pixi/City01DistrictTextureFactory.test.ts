import { describe, expect, it } from 'vitest';
import {
  isCity01DistrictRuntimeAsset,
  softenCity01DistrictPixelAlpha
} from './City01DistrictTextureFactory';

describe('City01DistrictTextureFactory', () => {
  it('routes every powered and blackout City-01 district through the cached treatment', () => {
    for (const kind of ['residential', 'commercial', 'industrial', 'public', 'old_town']) {
      expect(isCity01DistrictRuntimeAsset(`commercial_district_${kind}_night`)).toBe(true);
      expect(isCity01DistrictRuntimeAsset(`commercial_district_${kind}_blackout`)).toBe(true);
    }
    expect(isCity01DistrictRuntimeAsset('commercial_facility_solar_active')).toBe(false);
  });

  it('keeps fully opaque subject pixels away from the edge', () => {
    expect(softenCity01DistrictPixelAlpha(255, 255, 80, 140, 70, 0.5)).toBe(255);
  });

  it('softens a neutral outer platform edge', () => {
    const alpha = softenCity01DistrictPixelAlpha(255, 150, 75, 78, 80, 0.72);
    expect(alpha).toBeLessThan(50);
    expect(alpha).toBeGreaterThan(0);
  });

  it('removes the dark raised underside near the bottom edge', () => {
    expect(softenCity01DistrictPixelAlpha(255, 190, 55, 58, 60, 0.9)).toBe(0);
  });

  it('preserves colourful vegetation and façades while feathering their silhouette', () => {
    const green = softenCity01DistrictPixelAlpha(255, 180, 40, 125, 55, 0.7);
    const red = softenCity01DistrictPixelAlpha(255, 180, 150, 55, 40, 0.7);
    expect(green).toBe(180);
    expect(red).toBe(180);
  });
});
