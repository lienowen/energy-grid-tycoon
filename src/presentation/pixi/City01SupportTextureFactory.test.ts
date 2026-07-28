import { describe, expect, it } from 'vitest';
import {
  city01SupportCanvasSpec,
  isCity01SupportRuntimeAsset
} from './City01SupportTextureFactory';

describe('City01SupportTextureFactory', () => {
  it('routes only approved ground placement and effect ids through the normalizer', () => {
    expect(isCity01SupportRuntimeAsset('city01_ground_paved')).toBe(true);
    expect(isCity01SupportRuntimeAsset('city01_placement_valid')).toBe(true);
    expect(isCity01SupportRuntimeAsset('city01_fx_energize')).toBe(true);
    expect(isCity01SupportRuntimeAsset('commercial_facility_solar_active')).toBe(false);
  });

  it('normalizes ground and placement cuts to one 512 by 256 contract', () => {
    expect(city01SupportCanvasSpec('city01_ground_grass')).toEqual({
      width: 512,
      height: 256,
      maxSubjectWidth: 486,
      maxSubjectHeight: 216,
      anchorY: 0.82
    });
    expect(city01SupportCanvasSpec('city01_placement_invalid')).toEqual({
      width: 512,
      height: 256,
      maxSubjectWidth: 452,
      maxSubjectHeight: 214,
      anchorY: 0.72
    });
  });

  it('normalizes effects independently from facility subjects', () => {
    expect(city01SupportCanvasSpec('city01_fx_smoke_dark')).toEqual({
      width: 512,
      height: 512,
      maxSubjectWidth: 280,
      maxSubjectHeight: 350,
      anchorY: 0.85
    });
    expect(city01SupportCanvasSpec('city01_fx_spark')).toEqual({
      width: 512,
      height: 512,
      maxSubjectWidth: 360,
      maxSubjectHeight: 190,
      anchorY: 0.55
    });
  });
});
