import type {
  TileWorldConfig,
  TileWorldGridPointConfig,
  TileWorldRoadLaneWidth
} from '../layout/LevelSceneLayout';
import type {
  ScenePoint,
  TileWorldCellSceneState,
  TileWorldSceneState
} from '../CitySceneTypes';
import { toScenePoint } from '../CitySceneVisuals';
import { RoadAutoTiler, type RoadGrid } from '../pixi/generation/RoadAutoTiler';
import { TerrainAutoTiler, type TerrainWaterGrid } from './TerrainAutoTiler';

interface RoadCell {
  laneWidth: TileWorldRoadLaneWidth;
  pathIds: Set<string>;
}

const key = (x: number, y: number): string => `${x}:${y}`;

const difference = (to: ScenePoint, from: ScenePoint): ScenePoint => ({
  x: to.x - from.x,
  z: to.z - from.z,
  elevation: to.elevation - from.elevation
});

const inRect = (
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean => x >= rect.x
  && y >= rect.y
  && x < rect.x + rect.width
  && y < rect.y + rect.height;

const cellPoint = (
  config: TileWorldConfig,
  gridX: number,
  gridY: number,
  elevation = 0
): ScenePoint => toScenePoint({
  x: config.originX + (gridX + 0.5) * config.cellSize,
  y: config.originY + (gridY + 0.5) * config.cellSize,
  elevation
});

/**
 * Rasterises a segment without diagonal jumps. RoadAutoTiler uses four-neighbour
 * masks, so every consecutive cell must share one edge rather than one corner.
 */
const rasterizeSegment = (
  from: TileWorldGridPointConfig,
  to: TileWorldGridPointConfig,
  visit: (x: number, y: number) => void
): void => {
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let progressedX = 0;
  let progressedY = 0;

  visit(x, y);
  while (x !== to.x || y !== to.y) {
    const chooseX = x !== to.x && (
      y === to.y
      || (1 + progressedX * 2) * dy <= (1 + progressedY * 2) * dx
    );
    if (chooseX) {
      x += sx;
      progressedX += 1;
    } else {
      y += sy;
      progressedY += 1;
    }
    visit(x, y);
  }
};

const buildRoadCells = (config: TileWorldConfig): Map<string, RoadCell> => {
  const cells = new Map<string, RoadCell>();
  const add = (x: number, y: number, laneWidth: TileWorldRoadLaneWidth, pathId: string): void => {
    if (x < 0 || y < 0 || x >= config.columns || y >= config.rows) return;
    const id = key(x, y);
    const current = cells.get(id);
    if (current) {
      current.laneWidth = Math.max(current.laneWidth, laneWidth) as TileWorldRoadLaneWidth;
      current.pathIds.add(pathId);
      return;
    }
    cells.set(id, { laneWidth, pathIds: new Set([pathId]) });
  };

  for (const path of config.roadPaths) {
    if (path.points.length === 1) {
      const only = path.points[0];
      if (only) add(only.x, only.y, path.laneWidth, path.id);
      continue;
    }
    for (let index = 1; index < path.points.length; index += 1) {
      const from = path.points[index - 1];
      const to = path.points[index];
      if (!from || !to) continue;
      rasterizeSegment(from, to, (x, y) => add(x, y, path.laneWidth, path.id));
    }
  }

  for (const anchor of config.roadAnchors) {
    add(anchor.x, anchor.y, anchor.laneWidth, anchor.id);
  }
  return cells;
};

export class TileWorldBuilder {
  static build(config: TileWorldConfig): TileWorldSceneState {
    const roadCells = buildRoadCells(config);
    const roadGrid: RoadGrid = {
      hasRoad: (x, y) => roadCells.has(key(x, y))
    };

    const isWater = (x: number, y: number): boolean => {
      // City-01 deliberately opens to water on the west and south while land
      // continues beyond the north/east fog, avoiding a closed island shape.
      if (x < 0 || y >= config.rows) return true;
      if (y < 0 || x >= config.columns) return false;
      const westDepth = config.westWaterColumnsByRow?.[y] ?? 0;
      const southDepth = config.southWaterRowsByColumn?.[x] ?? 0;
      return x < westDepth || y >= config.rows - southDepth;
    };
    const waterGrid: TerrainWaterGrid = { isWater };

    const anchorByCell = new Map(
      config.roadAnchors.map((anchor) => [key(anchor.x, anchor.y), anchor])
    );

    const cells: TileWorldCellSceneState[] = [];
    for (let gridY = 0; gridY < config.rows; gridY += 1) {
      for (let gridX = 0; gridX < config.columns; gridX += 1) {
        const terrain = isWater(gridX, gridY) ? 'water' : config.defaultTerrain;
        const unlocked = terrain !== 'water'
          && config.unlockedRegions.some((region) => inRect(gridX, gridY, region));
        const road = roadCells.get(key(gridX, gridY));
        const roadMask = road ? RoadAutoTiler.calculateMask(gridX, gridY, roadGrid) : 0;
        const anchor = anchorByCell.get(key(gridX, gridY));
        const point = cellPoint(config, gridX, gridY, terrain === 'water' ? -0.42 : -0.2);
        const cell: TileWorldCellSceneState = {
          ...point,
          gridX,
          gridY,
          terrain,
          unlocked,
          buildable: terrain !== 'water' && unlocked && !road,
          shoreMask: terrain === 'water'
            ? 0
            : TerrainAutoTiler.calculateShoreMask(gridX, gridY, waterGrid),
          roadMask,
          variation: Math.abs((gridX * 17 + gridY * 31 + gridX * gridY * 3) % 7)
        };
        if (road) {
          cell.roadLaneWidth = road.laneWidth;
          cell.roadAssetId = RoadAutoTiler.getAssetId(roadMask, road.laneWidth);
        }
        if (anchor) {
          cell.roadEntryId = anchor.id;
          cell.roadEntryEdge = anchor.edge;
        }
        cells.push(cell);
      }
    }

    const origin = cellPoint(config, 0, 0);
    const nextX = cellPoint(config, 1, 0);
    const nextY = cellPoint(config, 0, 1);

    return {
      columns: config.columns,
      rows: config.rows,
      cellSize: config.cellSize,
      basisX: difference(nextX, origin),
      basisY: difference(nextY, origin),
      cells,
      entryPoints: config.roadAnchors.map((anchor) => ({
        ...cellPoint(config, anchor.x, anchor.y, 0.02),
        id: anchor.id,
        gridX: anchor.x,
        gridY: anchor.y,
        edge: anchor.edge,
        laneWidth: anchor.laneWidth
      }))
    };
  }
}
