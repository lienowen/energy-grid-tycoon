import { TerrainNeighbor } from './TerrainAutoTiler';

const CARDINAL_MASK =
  TerrainNeighbor.North
  | TerrainNeighbor.East
  | TerrainNeighbor.South
  | TerrainNeighbor.West;

export const CITY01_VALID_COAST_MASKS = [
  0, 1, 2, 4, 5, 8, 9, 10, 16, 17, 18, 20, 21, 32, 33, 34,
  36, 37, 40, 41, 42, 64, 65, 66, 68, 69, 72, 73, 74, 80, 81, 82,
  84, 85, 128, 130, 132, 136, 138, 144, 146, 148, 160, 162, 164,
  168, 170
] as const;

export const normalizeCity01CoastMask = (mask: number): number => {
  let normalized = mask & CARDINAL_MASK;

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

const variationSuffix = (variation: number): string =>
  String(Math.abs(variation) % 4).padStart(2, '0');

export const resolveCity01TerrainFrame = (
  rawShoreMask: number,
  variation = 0
): string => {
  const normalized = normalizeCity01CoastMask(rawShoreMask);
  return normalized === 0
    ? `terrain_grass_${variationSuffix(variation)}`
    : `terrain_coast_mask_${String(normalized).padStart(3, '0')}`;
};

export const resolveCity01WaterFrame = (variation = 0): string =>
  `terrain_water_${variationSuffix(variation)}`;
