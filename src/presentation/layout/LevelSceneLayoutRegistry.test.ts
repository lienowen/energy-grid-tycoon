import { describe, expect, it } from 'vitest';
import { LevelSceneLayoutRegistry } from './LevelSceneLayoutRegistry';

describe('LevelSceneLayoutRegistry', () => {
  it('provides the authored Dawn City vertical slice', () => {
    const layout = LevelSceneLayoutRegistry.resolve('city-01');

    expect(layout?.mode).toBe('authored');
    expect(layout?.districts).toHaveLength(5);
    expect(layout?.districts.map((district) => district.kind)).toEqual([
      'residential',
      'commercial',
      'industrial',
      'public',
      'old_town'
    ]);
    expect(layout?.roads.length).toBeGreaterThanOrEqual(5);
    expect(layout?.environment.some((item) => item.kind === 'water')).toBe(true);
    expect(layout?.environment.some((item) => item.kind === 'ridge')).toBe(true);
  });

  it('keeps procedural rendering as the fallback for other levels', () => {
    expect(LevelSceneLayoutRegistry.resolve('city-02')).toBeUndefined();
  });

  it('uses unique identifiers inside the authored scene', () => {
    const layout = LevelSceneLayoutRegistry.resolve('city-01');
    expect(layout).toBeDefined();
    if (!layout) return;

    const ids = [
      ...layout.districts.map((item) => item.id),
      ...layout.roads.map((item) => item.id),
      ...layout.environment.map((item) => item.id)
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
