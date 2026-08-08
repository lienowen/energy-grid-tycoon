import { describe, expect, it } from 'vitest';
import { monsterSpriteFor } from './BattleAssetCatalog';

describe('City-01 monster presentation hierarchy', () => {
  it('keeps the boss readable as a threat without turning it into a billboard', () => {
    const crawler = monsterSpriteFor('crawler', 'walk');
    const brute = monsterSpriteFor('brute', 'walk');
    const boss = monsterSpriteFor('boss', 'walk');

    expect(crawler).toBeDefined();
    expect(brute).toBeDefined();
    expect(boss).toBeDefined();
    if (!crawler || !brute || !boss) return;

    expect(crawler.width).toBeLessThan(brute.width);
    expect(brute.width).toBeLessThan(boss.width);
    expect(boss.width / brute.width).toBeGreaterThanOrEqual(1.35);
    expect(boss.width / brute.width).toBeLessThanOrEqual(1.55);
  });
});
