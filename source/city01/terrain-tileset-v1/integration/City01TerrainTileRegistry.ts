/**
 * City01TerrainTileRegistry
 *
 * Generated for terrain_coast_v1.png/json.
 * Export frames are 256x128 (@2x); render at 128x64 logical size.
 */

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

export const CITY01_VALID_COAST_MASKS = [0, 1, 2, 4, 5, 8, 9, 10, 16, 17, 18, 20, 21, 32, 33, 34, 36, 37, 40, 41, 42, 64, 65, 66, 68, 69, 72, 73, 74, 80, 81, 82, 84, 85, 128, 130, 132, 136, 138, 144, 146, 148, 160, 162, 164, 168, 170] as const;

export const normalizeCity01CoastMask = (mask: number): number => {
  const cardinalMask =
    TerrainNeighbor.North
    | TerrainNeighbor.East
    | TerrainNeighbor.South
    | TerrainNeighbor.West;

  let normalized = mask & cardinalMask;

  if (
    (mask & TerrainNeighbor.NorthEast) !== 0
    && (mask & TerrainNeighbor.North) === 0
    && (mask & TerrainNeighbor.East) === 0
  ) normalized |= TerrainNeighbor.NorthEast;

  if (
    (mask & TerrainNeighbor.SouthEast) !== 0
    && (mask & TerrainNeighbor.East) === 0
    && (mask & TerrainNeighbor.South) === 0
  ) normalized |= TerrainNeighbor.SouthEast;

  if (
    (mask & TerrainNeighbor.SouthWest) !== 0
    && (mask & TerrainNeighbor.South) === 0
    && (mask & TerrainNeighbor.West) === 0
  ) normalized |= TerrainNeighbor.SouthWest;

  if (
    (mask & TerrainNeighbor.NorthWest) !== 0
    && (mask & TerrainNeighbor.West) === 0
    && (mask & TerrainNeighbor.North) === 0
  ) normalized |= TerrainNeighbor.NorthWest;

  return normalized;
};

export const resolveCity01TerrainFrame = (
  rawShoreMask: number,
  variation = 0
): string => {
  const normalized = normalizeCity01CoastMask(rawShoreMask);
  if (normalized === 0) {
    return `terrain_grass_${String(Math.abs(variation) % 4).padStart(2, '0')}`;
  }
  return `terrain_coast_mask_${String(normalized).padStart(3, '0')}`;
};

export const resolveCity01WaterFrame = (variation = 0): string =>
  `terrain_water_${String(Math.abs(variation) % 4).padStart(2, '0')}`;

export const CITY01_TERRAIN_LOGICAL_SIZE = { width: 128, height: 64 } as const;
export const CITY01_TERRAIN_EXPORT_SIZE = { width: 256, height: 128 } as const;
