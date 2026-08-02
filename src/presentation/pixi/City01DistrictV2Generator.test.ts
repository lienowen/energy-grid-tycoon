import { describe, expect, it } from 'vitest';
import generatorSource from './City01DistrictV2Generator.ts?raw';
import {
  CITY01_DISTRICT_V2_CONTRACT,
  city01GeneratedDistrictKind
} from './City01DistrictV2Generator';

describe('City01DistrictV2Generator', () => {
  it('generates public, industrial and old-town modules only', () => {
    expect(city01GeneratedDistrictKind('commercial_district_public_night')).toBe('public');
    expect(city01GeneratedDistrictKind('commercial_district_industrial_blackout')).toBe('industrial');
    expect(city01GeneratedDistrictKind('commercial_district_old_town_night')).toBe('old-town');
    expect(city01GeneratedDistrictKind('commercial_district_residential_night')).toBeUndefined();
    expect(CITY01_DISTRICT_V2_CONTRACT.generatedKinds).toEqual(['public', 'industrial', 'old-town']);
  });

  it('shares the Art V2 camera, light and Tile World grounding contract', () => {
    expect(CITY01_DISTRICT_V2_CONTRACT.camera).toBe('isometric-2-to-1');
    expect(CITY01_DISTRICT_V2_CONTRACT.lightSource).toBe('upper-left');
    expect(CITY01_DISTRICT_V2_CONTRACT.hardRectangularBase).toBe(false);
    expect(CITY01_DISTRICT_V2_CONTRACT.textualSignage).toBe(false);
    expect(CITY01_DISTRICT_V2_CONTRACT.sharedTileWorldGrounding).toBe(true);
  });

  it('contains distinct civic, clean-industrial and heritage compositions', () => {
    expect(generatorSource).toContain('drawPublicDistrict');
    expect(generatorSource).toContain('drawIndustrialDistrict');
    expect(generatorSource).toContain('drawOldTownDistrict');
    expect(generatorSource).toContain('Clean production hall and logistics warehouse');
    expect(generatorSource).toContain('small civic square');
    expect(generatorSource).not.toContain('fillText(');
  });
});
