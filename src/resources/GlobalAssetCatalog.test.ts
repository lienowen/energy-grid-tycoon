import { describe, expect, it } from 'vitest';
import { globalAssetCatalog } from './GlobalAssetCatalog';

describe('GlobalAssetCatalog', () => {
  it('activates the City-01 product district pack through the existing runtime ids', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));

    expect(entries.get('commercial_district_residential_night')?.src)
      .toBe('/assets/city01/product/districts/runtime/district-residential-grounded.svg');
    expect(entries.get('commercial_district_residential_blackout')?.src)
      .toBe('/assets/city01/product/districts/runtime/district-residential-grounded.svg');
    expect(entries.get('commercial_district_commercial_night')?.src)
      .toBe('/assets/city01/product/districts/district-commercial-base.png');
    expect(entries.get('commercial_district_industrial_blackout')?.src)
      .toBe('/assets/city01/product/districts/district-industrial-base.png');
    expect(entries.get('commercial_district_public_night')?.src)
      .toBe('/assets/city01/product/districts/district-public-base.png');
    expect(entries.get('commercial_district_old_town_blackout')?.src)
      .toBe('/assets/city01/product/districts/district-old-town-base.png');
  });

  it('keeps the shared district grounding layer available at the same authored anchor', () => {
    const entries = new Map(globalAssetCatalog.entries.map((entry) => [entry.id, entry]));
    const grounding = entries.get('commercial_district_shadow');

    expect(grounding?.src).toBe('/assets/commercial/districts/shadow.svg');
    expect(grounding?.width).toBe(1024);
    expect(grounding?.height).toBe(768);
    expect(grounding?.anchor).toEqual({ x: 0.5, y: 0.86 });
    expect(grounding?.preload).toBe('level');
  });

  it('keeps runtime asset ids unique after all catalogs are merged', () => {
    const ids = globalAssetCatalog.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
