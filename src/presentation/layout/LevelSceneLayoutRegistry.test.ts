import { describe, expect, it } from 'vitest';
import { LevelSceneLayoutRegistry } from './LevelSceneLayoutRegistry';

describe('LevelSceneLayoutRegistry', () => {
  it('provides the authored Dawn City commercial slice', () => {
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
    expect(layout?.plotAnchors).toHaveLength(8);
    expect(layout?.energyNetwork.nodes.length).toBeGreaterThanOrEqual(10);
    expect(layout?.energyNetwork.edges.length).toBeGreaterThanOrEqual(10);
  });

  it('keeps procedural rendering as the fallback for other levels', () => {
    expect(LevelSceneLayoutRegistry.resolve('city-02')).toBeUndefined();
  });

  it('uses unique identifiers and valid network endpoints', () => {
    const layout = LevelSceneLayoutRegistry.resolve('city-01');
    expect(layout).toBeDefined();
    if (!layout) return;

    const ids = [
      ...layout.districts.map((item) => item.id),
      ...layout.roads.map((item) => item.id),
      ...layout.environment.map((item) => item.id),
      ...layout.energyNetwork.nodes.map((item) => item.id),
      ...layout.energyNetwork.edges.map((item) => item.id)
    ];
    expect(new Set(ids).size).toBe(ids.length);

    const nodeIds = new Set(layout.energyNetwork.nodes.map((node) => node.id));
    for (const edge of layout.energyNetwork.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
      expect(edge.capacity).toBeGreaterThan(0);
    }

    const plotIds = layout.plotAnchors?.map((anchor) => anchor.plotId) ?? [];
    expect(new Set(plotIds).size).toBe(plotIds.length);
  });
});
