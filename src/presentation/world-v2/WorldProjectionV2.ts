import type { WorldV2Point } from './WorldContractsV2';

export interface WorldProjectionV2Config {
  cellWidth: number;
  cellHeight: number;
  elevationHeight: number;
}

export interface WorldV2ScreenPoint {
  x: number;
  y: number;
}

export const DEFAULT_WORLD_V2_PROJECTION: WorldProjectionV2Config = {
  cellWidth: 128,
  cellHeight: 64,
  elevationHeight: 11.5
};

/**
 * One projection is shared by terrain, roads, plots, districts and facilities.
 * World V2 code must not introduce per-layer coordinate conversion helpers.
 */
export class WorldProjectionV2 {
  constructor(private readonly config: WorldProjectionV2Config = DEFAULT_WORLD_V2_PROJECTION) {
    if (!(config.cellWidth > 0) || !(config.cellHeight > 0) || !(config.elevationHeight > 0)) {
      throw new Error('World V2 projection dimensions must be positive');
    }
  }

  project(point: WorldV2Point): WorldV2ScreenPoint {
    const elevation = point.elevation ?? 0;
    return {
      x: (point.x - point.z) * this.config.cellWidth * 0.5,
      y: (point.x + point.z) * this.config.cellHeight * 0.5
        - elevation * this.config.elevationHeight
    };
  }

  /**
   * Converts a ground-plane screen position back to world cells. Elevation is
   * intentionally explicit because screen coordinates alone cannot recover it.
   */
  unproject(screen: WorldV2ScreenPoint, elevation = 0): WorldV2Point {
    const groundY = screen.y + elevation * this.config.elevationHeight;
    const xMinusZ = (screen.x * 2) / this.config.cellWidth;
    const xPlusZ = (groundY * 2) / this.config.cellHeight;
    return {
      x: (xMinusZ + xPlusZ) * 0.5,
      z: (xPlusZ - xMinusZ) * 0.5,
      elevation
    };
  }

  depth(point: WorldV2Point, offset = 0): number {
    return Math.round(
      (point.x + point.z) * 1000
      + (point.elevation ?? 0) * 100
      + offset
    );
  }
}
