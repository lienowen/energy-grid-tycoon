import { describe, expect, it } from 'vitest';
import type {
  DistrictPrefabSceneState,
  FacilitySceneState
} from '../CitySceneTypes';
import rendererSource from './City01IntegratedPixiWorld.ts?raw';
import {
  CITY01_LIGHT_DIRECTION,
  resolveDistrictPresentation,
  resolveFacilityPresentation
} from './City01BuildingPresentation';

const district = (kind: DistrictPrefabSceneState['kind']): DistrictPrefabSceneState => ({
  kind,
  scale: 1
} as DistrictPrefabSceneState);

const facility = (
  configId: string,
  category: FacilitySceneState['category'] = 'generation'
): FacilitySceneState => ({
  configId,
  category,
  scale: 1
} as FacilitySceneState);

describe('City-01 building presentation', () => {
  it('uses one upper-left light and lower-right contact-shadow contract', () => {
    expect(CITY01_LIGHT_DIRECTION.source).toBe('upper-left');
    for (const kind of ['residential', 'commercial', 'industrial', 'public', 'old_town'] as const) {
      const profile = resolveDistrictPresentation(district(kind));
      expect(profile.shadowOffsetX).toBeGreaterThan(0);
      expect(profile.shadowOffsetY).toBeGreaterThan(0);
      expect(profile.footprintWidthFactor).toBeLessThan(0.3);
      expect(profile.footprintHeightFactor).toBeLessThan(0.08);
    }
  });

  it('assigns restrained facility motion by energy technology', () => {
    expect(resolveFacilityPresentation(facility('wind-turbine')).motion).toBe('wind');
    expect(resolveFacilityPresentation(facility('gas-emergency')).motion).toBe('gas');
    expect(resolveFacilityPresentation(facility('battery-storage', 'storage')).motion).toBe('storage');
    expect(resolveFacilityPresentation(facility('solar-farm')).motion).toBe('solar');
    expect(resolveFacilityPresentation(facility('grid-substation')).motion).toBe('grid');
  });

  it('renders soft AO footprints and runtime facility life without hard pads', () => {
    expect(rendererSource).toContain('drawSoftGrounding');
    expect(rendererSource).toContain('drawFacilityAmbient');
    expect(rendererSource).toContain('this.app.ticker.add(this.animateAmbient)');
    expect(rendererSource).not.toContain('districtGroundColors');
    expect(rendererSource).not.toContain('facilityGroundColor');
  });
});
