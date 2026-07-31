export enum TerrainNeighbor {
  North = 1 << 0,
  NorthEast = 1 << 1,
  East = 1 << 2,
  SouthEast = 1 << 3,
  South = 1 << 4,
  SouthWest = 1 << 5,
  West = 1 << 6,
  NorthWest = 1 << 7
}

export interface TerrainWaterGrid {
  isWater(x: number, y: number): boolean;
}

export type TerrainTransitionKind =
  | 'interior'
  | 'edge'
  | 'outer-corner'
  | 'channel'
  | 'peninsula';

const CARDINAL_MASK =
  TerrainNeighbor.North
  | TerrainNeighbor.East
  | TerrainNeighbor.South
  | TerrainNeighbor.West;

export class TerrainAutoTiler {
  /** Returns the eight-neighbour water mask for one land tile. */
  static calculateShoreMask(x: number, y: number, grid: TerrainWaterGrid): number {
    let mask = 0;
    if (grid.isWater(x, y - 1)) mask |= TerrainNeighbor.North;
    if (grid.isWater(x + 1, y - 1)) mask |= TerrainNeighbor.NorthEast;
    if (grid.isWater(x + 1, y)) mask |= TerrainNeighbor.East;
    if (grid.isWater(x + 1, y + 1)) mask |= TerrainNeighbor.SouthEast;
    if (grid.isWater(x, y + 1)) mask |= TerrainNeighbor.South;
    if (grid.isWater(x - 1, y + 1)) mask |= TerrainNeighbor.SouthWest;
    if (grid.isWater(x - 1, y)) mask |= TerrainNeighbor.West;
    if (grid.isWater(x - 1, y - 1)) mask |= TerrainNeighbor.NorthWest;
    return mask;
  }

  static getCardinalMask(mask: number): number {
    return mask & CARDINAL_MASK;
  }

  static getTransitionKind(mask: number): TerrainTransitionKind {
    const cardinal = TerrainAutoTiler.getCardinalMask(mask);
    if (cardinal === 0) return mask === 0 ? 'interior' : 'outer-corner';

    const cardinalCount = [
      TerrainNeighbor.North,
      TerrainNeighbor.East,
      TerrainNeighbor.South,
      TerrainNeighbor.West
    ].filter((bit) => (cardinal & bit) !== 0).length;

    if (cardinalCount === 1) return 'edge';
    if (cardinalCount === 2) {
      const opposite = cardinal === (TerrainNeighbor.North | TerrainNeighbor.South)
        || cardinal === (TerrainNeighbor.East | TerrainNeighbor.West);
      return opposite ? 'channel' : 'outer-corner';
    }
    return 'peninsula';
  }
}
