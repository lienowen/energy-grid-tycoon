import { describe, expect, it } from 'vitest';
import factorySource from './City01DistrictTextureFactory.ts?raw';
import {
  city01DistrictRuntimeTreatment,
  isCity01DistrictRuntimeAsset,
  softenCity01DistrictPixelAlpha
} from './City01DistrictTextureFactory';

describe('City01DistrictTextureFactory', () => {
  it('routes the three highest-impact districts through modular Art V2 rendering', () => {
    for (const kind of ['public', 'industrial', 'old_town']) {
      expect(city01DistrictRuntimeTreatment(`commercial_district_${kind}_night`)).toBe('generated-v2');
      expect(city01DistrictRuntimeTreatment(`commercial_district_${kind}_blackout`)).toBe('generated-v2');
    }
    expect(factorySource).toContain('createCity01DistrictV2Texture');
    expect(factorySource).toContain("treatment === 'generated-v2'");
  });

  it('keeps residential and commercial districts on the softened legacy route', () => {
    for (const kind of ['residential', 'commercial']) {
      expect(city01DistrictRuntimeTreatment(`commercial_district_${kind}_night`)).toBe('legacy-softened');
      expect(city01DistrictRuntimeTreatment(`commercial_district_${kind}_blackout`)).toBe('legacy-softened');
      expect(isCity01DistrictRuntimeAsset(`commercial_district_${kind}_night`)).toBe(true);
    }
    expect(city01DistrictRuntimeTreatment('commercial_facility_solar_active')).toBe('none');
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
