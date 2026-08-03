import { describe, expect, it } from 'vitest';
import expansionSource from './City01DistrictV2ExpansionGenerator.ts?raw';
import {
  CITY01_DISTRICT_V2_EXPANSION_CONTRACT,
  expandedCity01DistrictKind
} from './City01DistrictV2ExpansionGenerator';
import { city01DistrictRuntimeTreatment } from './City01DistrictTextureFactory';

describe('City01DistrictV2ExpansionGenerator', () => {
  it('recognizes residential and commercial district assets', () => {
    expect(expandedCity01DistrictKind('commercial_district_residential_night'))
      .toBe('residential');
    expect(expandedCity01DistrictKind('commercial_district_commercial_blackout'))
      .toBe('commercial');
    expect(expandedCity01DistrictKind('commercial_district_public_night'))
      .toBeUndefined();
  });

  it('routes residential and commercial assets through generated V2 textures', () => {
    expect(city01DistrictRuntimeTreatment('commercial_district_residential_night'))
      .toBe('generated-v2');
    expect(city01DistrictRuntimeTreatment('commercial_district_commercial_night'))
      .toBe('generated-v2');
  });

  it('uses modular buildings without baked signage or a hard district base', () => {
    expect(CITY01_DISTRICT_V2_EXPANSION_CONTRACT.generatedKinds)
      .toEqual(['residential', 'commercial']);
    expect(CITY01_DISTRICT_V2_EXPANSION_CONTRACT.modularBuildings).toBe(true);
    expect(CITY01_DISTRICT_V2_EXPANSION_CONTRACT.hardRectangularBase).toBe(false);
    expect(expansionSource).toContain('drawResidentialDistrict');
    expect(expansionSource).toContain('drawCommercialDistrict');
    expect(expansionSource).not.toContain('fillText(');
  });
});
