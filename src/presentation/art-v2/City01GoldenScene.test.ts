import { describe, expect, it } from 'vitest';
import {
  CITY01_GOLDEN_SCENE_CAMERA,
  CITY01_GOLDEN_SCENE_DISTRICTS,
  CITY01_GOLDEN_SCENE_FOCUS,
  CITY01_GOLDEN_SCENE_NETWORK_POINTS,
  CITY01_GOLDEN_SCENE_REVISION
} from './City01GoldenScene';

const distance = (
  left: { x: number; y: number },
  right: { x: number; y: number }
): number => Math.hypot(left.x - right.x, left.y - right.y);

describe('City01 Golden Scene', () => {
  it('defines one versioned product-facing home composition', () => {
    expect(CITY01_GOLDEN_SCENE_REVISION).toBe('city01-golden-scene-1');
    expect(CITY01_GOLDEN_SCENE_CAMERA.startZoom).toBeGreaterThanOrEqual(1.3);
    expect(CITY01_GOLDEN_SCENE_CAMERA.startZoom).toBeLessThanOrEqual(1.42);
    expect(CITY01_GOLDEN_SCENE_CAMERA.startOffsetY).toBeGreaterThan(20);
    expect(CITY01_GOLDEN_SCENE_FOCUS.x).toBeGreaterThan(50);
    expect(CITY01_GOLDEN_SCENE_FOCUS.y).toBeGreaterThan(48);
  });

  it('keeps five readable districts with restrained scale', () => {
    expect(CITY01_GOLDEN_SCENE_DISTRICTS).toHaveLength(5);
    expect(new Set(CITY01_GOLDEN_SCENE_DISTRICTS.map((district) => district.id)).size).toBe(5);
    expect(new Set(CITY01_GOLDEN_SCENE_DISTRICTS.map((district) => `${district.x}:${district.y}`)).size).toBe(5);

    for (const district of CITY01_GOLDEN_SCENE_DISTRICTS) {
      expect(district.scale).toBeGreaterThanOrEqual(0.9);
      expect(district.scale).toBeLessThanOrEqual(1);
    }
  });

  it('separates the civic silhouette from the main substation', () => {
    const publicDistrict = CITY01_GOLDEN_SCENE_DISTRICTS.find((district) => district.kind === 'public');
    expect(publicDistrict).toBeDefined();
    expect(distance(publicDistrict!, CITY01_GOLDEN_SCENE_NETWORK_POINTS.mainSubstation)).toBeGreaterThan(12);
  });

  it('aligns district load nodes to their authored district centers', () => {
    const loadByKind = {
      residential: CITY01_GOLDEN_SCENE_NETWORK_POINTS.residentialLoad,
      commercial: CITY01_GOLDEN_SCENE_NETWORK_POINTS.commercialLoad,
      industrial: CITY01_GOLDEN_SCENE_NETWORK_POINTS.industrialLoad,
      public: CITY01_GOLDEN_SCENE_NETWORK_POINTS.publicLoad,
      old_town: CITY01_GOLDEN_SCENE_NETWORK_POINTS.oldTownLoad
    } as const;

    for (const district of CITY01_GOLDEN_SCENE_DISTRICTS) {
      expect(loadByKind[district.kind].x).toBe(district.x);
      expect(loadByKind[district.kind].y).toBe(district.y);
    }
  });
});
