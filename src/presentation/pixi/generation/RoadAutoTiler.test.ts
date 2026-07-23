import { describe, expect, it } from 'vitest';
import { RoadAutoTiler, RoadDirection, type RoadGrid } from './RoadAutoTiler';

const gridFrom = (roads: readonly string[]): RoadGrid => {
  const occupied = new Set(roads);
  return { hasRoad: (x, y) => occupied.has(`${x},${y}`) };
};

describe('RoadAutoTiler', () => {
  it('calculates a four-direction connection mask', () => {
    const grid = gridFrom(['0,-1', '1,0', '-1,0']);
    expect(RoadAutoTiler.calculateMask(0, 0, grid)).toBe(
      RoadDirection.North | RoadDirection.East | RoadDirection.West
    );
  });

  it('maps straight, corner, T and cross masks to registered V5 ids', () => {
    expect(RoadAutoTiler.getAssetId(5)).toBe('world_road_straight_2_ne');
    expect(RoadAutoTiler.getAssetId(3)).toBe('world_road_curve_2_e');
    expect(RoadAutoTiler.getAssetId(14)).toBe('world_road_t_2_n');
    expect(RoadAutoTiler.getAssetId(15)).toBe('world_road_cross_2');
  });

  it('sanitizes masks to the lower four direction bits', () => {
    expect(RoadAutoTiler.getAssetId(31)).toBe('world_road_cross_2');
  });
});
