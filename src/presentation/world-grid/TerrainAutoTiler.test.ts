import { describe, expect, it } from 'vitest';
import { TerrainAutoTiler, TerrainNeighbor } from './TerrainAutoTiler';

const waterGrid = (water: readonly string[]) => ({
  isWater: (x: number, y: number): boolean => water.includes(`${x}:${y}`)
});

describe('TerrainAutoTiler', () => {
  it('encodes all eight shoreline neighbours in one stable bitmask', () => {
    const mask = TerrainAutoTiler.calculateShoreMask(4, 4, waterGrid([
      '4:3',
      '5:3',
      '5:4',
      '3:5'
    ]));

    expect(mask).toBe(
      TerrainNeighbor.North
      | TerrainNeighbor.NorthEast
      | TerrainNeighbor.East
      | TerrainNeighbor.SouthWest
    );
  });

  it('classifies interior, edge, channel and peninsula transitions', () => {
    expect(TerrainAutoTiler.getTransitionKind(0)).toBe('interior');
    expect(TerrainAutoTiler.getTransitionKind(TerrainNeighbor.West)).toBe('edge');
    expect(TerrainAutoTiler.getTransitionKind(
      TerrainNeighbor.North | TerrainNeighbor.South
    )).toBe('channel');
    expect(TerrainAutoTiler.getTransitionKind(
      TerrainNeighbor.North | TerrainNeighbor.East | TerrainNeighbor.South
    )).toBe('peninsula');
  });

  it('treats diagonal-only water as an outer corner transition', () => {
    expect(TerrainAutoTiler.getTransitionKind(TerrainNeighbor.SouthEast)).toBe('outer-corner');
  });
});
