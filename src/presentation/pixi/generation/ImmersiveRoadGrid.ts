import type { RoadSceneState, ScenePoint } from '../../CitySceneTypes';
import type { RoadGrid } from './RoadAutoTiler';

export interface ImmersiveRoadCell {
  gridX: number;
  gridY: number;
  laneCount: 1 | 2;
  powered: boolean;
  traffic: number;
}

const cellKey = (gridX: number, gridY: number): string => `${gridX}:${gridY}`;

const toGridPoint = (point: ScenePoint, step: number): { x: number; y: number } => ({
  x: Math.round(point.x / step),
  y: Math.round(point.z / step)
});

export class ImmersiveRoadGrid implements RoadGrid {
  private readonly cellsByKey = new Map<string, ImmersiveRoadCell>();

  constructor(readonly step: number) {}

  static fromRoads(roads: readonly RoadSceneState[], step = 10): ImmersiveRoadGrid {
    const grid = new ImmersiveRoadGrid(step);
    for (const road of roads) {
      if (road.points.length === 1) {
        const only = road.points[0];
        if (only) grid.addPoint(toGridPoint(only, step).x, toGridPoint(only, step).y, road);
        continue;
      }
      for (let index = 1; index < road.points.length; index += 1) {
        const from = road.points[index - 1];
        const to = road.points[index];
        if (!from || !to) continue;
        grid.addSegment(toGridPoint(from, step), toGridPoint(to, step), road);
      }
    }
    return grid;
  }

  get cells(): readonly ImmersiveRoadCell[] {
    return [...this.cellsByKey.values()];
  }

  hasRoad(gridX: number, gridY: number): boolean {
    return this.cellsByKey.has(cellKey(gridX, gridY));
  }

  getCell(gridX: number, gridY: number): ImmersiveRoadCell | undefined {
    return this.cellsByKey.get(cellKey(gridX, gridY));
  }

  nearest(sceneX: number, sceneZ: number): ImmersiveRoadCell | undefined {
    let nearest: ImmersiveRoadCell | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const cell of this.cellsByKey.values()) {
      const dx = sceneX - cell.gridX * this.step;
      const dz = sceneZ - cell.gridY * this.step;
      const distance = dx * dx + dz * dz;
      if (distance < nearestDistance) {
        nearest = cell;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private addSegment(
    from: { x: number; y: number },
    to: { x: number; y: number },
    road: RoadSceneState
  ): void {
    let x = from.x;
    let y = from.y;
    const dx = Math.abs(to.x - from.x);
    const sx = from.x < to.x ? 1 : -1;
    const dy = -Math.abs(to.y - from.y);
    const sy = from.y < to.y ? 1 : -1;
    let error = dx + dy;

    while (true) {
      this.addPoint(x, y, road);
      if (x === to.x && y === to.y) break;
      const doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
  }

  private addPoint(gridX: number, gridY: number, road: RoadSceneState): void {
    const key = cellKey(gridX, gridY);
    const current = this.cellsByKey.get(key);
    if (current) {
      current.laneCount = current.laneCount === 2 || road.laneCount === 2 ? 2 : 1;
      current.powered = current.powered || road.powered;
      current.traffic = Math.max(current.traffic, road.traffic);
      return;
    }
    this.cellsByKey.set(key, {
      gridX,
      gridY,
      laneCount: road.laneCount,
      powered: road.powered,
      traffic: road.traffic
    });
  }
}
