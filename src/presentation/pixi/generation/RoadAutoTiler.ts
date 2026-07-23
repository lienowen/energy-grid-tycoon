export enum RoadDirection {
  North = 1 << 0,
  East = 1 << 1,
  South = 1 << 2,
  West = 1 << 3
}

export interface RoadGrid {
  hasRoad(x: number, y: number): boolean;
}

const roadAssetByMask: Readonly<Record<number, string>> = {
  0: 'world_road_end_2_s',
  1: 'world_road_end_2_n',
  2: 'world_road_end_2_e',
  3: 'world_road_curve_2_e',
  4: 'world_road_end_2_s',
  5: 'world_road_straight_2_ne',
  6: 'world_road_curve_2_s',
  7: 'world_road_t_2_w',
  8: 'world_road_end_2_w',
  9: 'world_road_curve_2_n',
  10: 'world_road_straight_2_nw',
  11: 'world_road_t_2_s',
  12: 'world_road_curve_2_w',
  13: 'world_road_t_2_e',
  14: 'world_road_t_2_n',
  15: 'world_road_cross_2'
};

export class RoadAutoTiler {
  static calculateMask(x: number, y: number, grid: RoadGrid): number {
    let mask = 0;
    if (grid.hasRoad(x, y - 1)) mask |= RoadDirection.North;
    if (grid.hasRoad(x + 1, y)) mask |= RoadDirection.East;
    if (grid.hasRoad(x, y + 1)) mask |= RoadDirection.South;
    if (grid.hasRoad(x - 1, y)) mask |= RoadDirection.West;
    return mask;
  }

  static getAssetId(mask: number): string {
    return roadAssetByMask[mask & 0b1111] ?? roadAssetByMask[0] ?? 'world_road_end_2_s';
  }
}
