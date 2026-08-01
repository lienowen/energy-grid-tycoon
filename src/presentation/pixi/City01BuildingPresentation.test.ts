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
  it('uses one upper-left light and logical Tile World footprints', () => {
    expect(CITY01_LIGHT_DIRECTION.source).toBe('upper-left');
    for (const kind of ['residential', 'commercial', 'industrial', 'public', 'old_town'] as const) {
      const profile = resolveDistrictPresentation(district(kind));
      expect(profile.shadowOffsetX).toBeGreaterThan(0);
      expect(profile.shadowOffsetY).toBeGreaterThan(0);
      expect(profile.footprintColumns).toBeGreaterThanOrEqual(2);
      expect(profile.footprintRows).toBeGreaterThanOrEqual(2);
      expect(profile.roadConnection).toBe(true);
      expect(profile.toneTint).toBeLessThanOrEqual(0xffffff);
      expect(profile.detailMinZoom).toBeGreaterThan(0.7);
    }
  });

  it('assigns restrained facility motion and technology-specific footprints', () => {
    const wind = resolveFacilityPresentation(facility('wind-turbine'));
    const gas = resolveFacilityPresentation(facility('gas-emergency'));
    const storage = resolveFacilityPresentation(facility('battery-storage', 'storage'));
    const solar = resolveFacilityPresentation(facility('solar-farm'));
    const grid = resolveFacilityPresentation(facility('grid-substation'));

    expect(wind.motion).toBe('wind');
    expect(wind.footprintColumns).toBe(1);
    expect(gas.motion).toBe('gas');
    expect(gas.footprintColumns).toBe(2);
    expect(gas.footprintRows).toBe(2);
    expect(storage.motion).toBe('storage');
    expect(solar.motion).toBe('solar');
    expect(solar.footprintColumns).toBe(2);
    expect(grid.motion).toBe('grid');
  });

  it('renders footprint-derived grounding, road links, tone and zoom lod', () => {
    expect(rendererSource).toContain("data.buildingPresentation = 'logical-footprint-v2'");
    expect(rendererSource).toContain('footprintCorners');
    expect(rendererSource).toContain('drawRoadConnection');
    expect(rendererSource).toContain('toneTint');
    expect(rendererSource).toContain('bindLod');
    expect(rendererSource).toContain('new Rectangle(-22, -22, 44, 44)');
    expect(rendererSource).not.toContain('footprintWidthFactor');
    expect(rendererSource).not.toContain('facilityGroundColor');
  });
});
