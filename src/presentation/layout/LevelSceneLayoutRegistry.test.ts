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
    expect(layout?.roads).toHaveLength(0);
    expect(layout?.worldGrid).toMatchObject({ columns: 36, rows: 30, cellSize: 4 });
    expect(layout?.worldGrid?.roadAnchors).toHaveLength(4);
    expect(layout?.worldGrid?.roadPaths.length).toBeGreaterThanOrEqual(6);
    expect(layout?.worldGrid?.unlockedRegions.length).toBeGreaterThan(0);
    expect(layout?.environment.some((item) => item.kind === 'water')).toBe(true);
    expect(layout?.environment.some((item) => item.kind === 'ridge')).toBe(true);
    expect(layout?.plotAnchors).toHaveLength(8);
    expect(layout?.energyNetwork.nodes.length).toBeGreaterThanOrEqual(10);
    expect(layout?.energyNetwork.edges.length).toBeGreaterThanOrEqual(10);
  });

  it('keeps procedural rendering as the fallback for other levels', () => {
    expect(LevelSceneLayoutRegistry.resolve('city-02')).toBeUndefined();
  });

  it('uses unique identifiers and valid network and road endpoints', () => {
    const layout = LevelSceneLayoutRegistry.resolve('city-01');
    expect(layout).toBeDefined();
    if (!layout) return;

    const ids = [
      ...layout.districts.map((item) => item.id),
      ...layout.roads.map((item) => item.id),
      ...layout.environment.map((item) => item.id),
      ...layout.energyNetwork.nodes.map((item) => item.id),
      ...layout.energyNetwork.edges.map((item) => item.id),
      ...(layout.worldGrid?.roadAnchors.map((item) => item.id) ?? []),
      ...(layout.worldGrid?.roadPaths.map((item) => item.id) ?? [])
    ];
    expect(new Set(ids).size).toBe(ids.length);

    const nodeIds = new Set(layout.energyNetwork.nodes.map((node) => node.id));
    for (const edge of layout.energyNetwork.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
      expect(edge.capacity).toBeGreaterThan(0);
    }

    const grid = layout.worldGrid;
    if (grid) {
      for (const anchor of grid.roadAnchors) {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThan(grid.columns);
        expect(anchor.y).toBeLessThan(grid.rows);
        expect(
          anchor.x === 0
          || anchor.y === 0
          || anchor.x === grid.columns - 1
          || anchor.y === grid.rows - 1
        ).toBe(true);
      }
    }

    const plotIds = layout.plotAnchors?.map((anchor) => anchor.plotId) ?? [];
    expect(new Set(plotIds).size).toBe(plotIds.length);
  });
});
