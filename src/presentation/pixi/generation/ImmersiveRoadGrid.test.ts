import { describe, expect, it } from 'vitest';
import type { RoadSceneState } from '../../CitySceneTypes';
import { ImmersiveRoadGrid } from './ImmersiveRoadGrid';

const road = (
  id: string,
  points: RoadSceneState['points'],
  laneCount: 1 | 2 = 1
): RoadSceneState => ({
  id,
  points,
  laneCount,
  traffic: 0.5,
  powered: true
});

describe('ImmersiveRoadGrid', () => {
  it('rasterizes a continuous segment into adjacent grid cells', () => {
    const grid = ImmersiveRoadGrid.fromRoads([
      road('main', [
        { x: 0, z: 0, elevation: 0 },
        { x: 30, z: 0, elevation: 0 }
      ])
    ], 10);

    expect(grid.cells.map((cell) => `${cell.gridX}:${cell.gridY}`)).toEqual([
      '0:0',
      '1:0',
      '2:0',
      '3:0'
    ]);
  });

  it('merges crossings and keeps the widest road metadata', () => {
    const grid = ImmersiveRoadGrid.fromRoads([
      road('horizontal', [
        { x: -10, z: 0, elevation: 0 },
        { x: 10, z: 0, elevation: 0 }
      ]),
      road('vertical', [
        { x: 0, z: -10, elevation: 0 },
        { x: 0, z: 10, elevation: 0 }
      ], 2)
    ], 10);

    expect(grid.getCell(0, 0)?.laneCount).toBe(2);
    expect(grid.hasRoad(0, -1)).toBe(true);
    expect(grid.hasRoad(1, 0)).toBe(true);
  });

  it('finds the nearest road cell for block alignment', () => {
    const grid = ImmersiveRoadGrid.fromRoads([
      road('main', [
        { x: 0, z: 0, elevation: 0 },
        { x: 20, z: 0, elevation: 0 }
      ])
    ], 10);

    expect(grid.nearest(18, 7)).toMatchObject({ gridX: 2, gridY: 0 });
  });
});
