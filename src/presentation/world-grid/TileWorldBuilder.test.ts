import { describe, expect, it } from 'vitest';
import type { TileWorldConfig } from '../layout/LevelSceneLayout';
import { TerrainNeighbor } from './TerrainAutoTiler';
import { TileWorldBuilder } from './TileWorldBuilder';

const config: TileWorldConfig = {
  columns: 8,
  rows: 7,
  cellSize: 4,
  originX: 10,
  originY: 20,
  defaultTerrain: 'grass',
  westWaterColumnsByRow: [2, 2, 1, 1, 1, 2, 2],
  southWaterRowsByColumn: [2, 2, 1, 1, 1, 1, 2, 2],
  unlockedRegions: [{ x: 2, y: 1, width: 4, height: 4 }],
  roadAnchors: [
    { id: 'north-entry', x: 4, y: 0, edge: 'north', laneWidth: 4 },
    { id: 'east-entry', x: 7, y: 3, edge: 'east', laneWidth: 4 }
  ],
  roadPaths: [
    { id: 'main', laneWidth: 4, points: [{ x: 4, y: 0 }, { x: 4, y: 3 }, { x: 7, y: 3 }] }
  ]
};

const cellAt = (world: ReturnType<typeof TileWorldBuilder.build>, x: number, y: number) =>
  world.cells.find((cell) => cell.gridX === x && cell.gridY === y);

describe('TileWorldBuilder', () => {
  it('builds one complete logical cell matrix with open coastlines', () => {
    const world = TileWorldBuilder.build(config);

    expect(world.cells).toHaveLength(config.columns * config.rows);
    expect(cellAt(world, 0, 2)?.terrain).toBe('water');
    expect(cellAt(world, 7, 0)?.terrain).toBe('grass');
    expect(cellAt(world, 4, 6)?.terrain).toBe('water');
  });

  it('autotiles coast and roads from neighbouring logical cells', () => {
    const world = TileWorldBuilder.build(config);
    const coast = cellAt(world, 1, 2);
    const intersection = cellAt(world, 4, 3);

    expect(coast?.terrain).toBe('grass');
    expect((coast?.shoreMask ?? 0) & TerrainNeighbor.West).not.toBe(0);
    expect(intersection?.roadMask).not.toBe(0);
    expect(intersection?.roadLaneWidth).toBe(4);
    expect(intersection?.roadAssetId).toContain('_4');
  });

  it('separates unlocked buildability from surrounding world continuity', () => {
    const world = TileWorldBuilder.build(config);

    expect(cellAt(world, 3, 2)).toMatchObject({ unlocked: true, buildable: true });
    expect(cellAt(world, 6, 2)).toMatchObject({ unlocked: false, buildable: false });
    expect(cellAt(world, 4, 2)).toMatchObject({ unlocked: true, buildable: false });
  });

  it('keeps explicit external road anchors in scene state', () => {
    const world = TileWorldBuilder.build(config);

    expect(world.entryPoints.map((entry) => entry.id)).toEqual(['north-entry', 'east-entry']);
    expect(cellAt(world, 4, 0)).toMatchObject({
      roadEntryId: 'north-entry',
      roadEntryEdge: 'north'
    });
  });
});
