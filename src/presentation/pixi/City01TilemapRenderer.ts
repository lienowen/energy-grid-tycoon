import { Container, Graphics, Text } from 'pixi.js';
import type {
  ScenePoint,
  TileWorldCellSceneState,
  TileWorldSceneState
} from '../CitySceneTypes';
import type { WorldLayers } from './WorldLayerManager';
import { TerrainNeighbor } from '../world-grid/TerrainAutoTiler';
import { RoadDirection } from './generation/RoadAutoTiler';

interface ScreenPoint {
  x: number;
  y: number;
}

interface TileCorners {
  top: ScreenPoint;
  right: ScreenPoint;
  bottom: ScreenPoint;
  left: ScreenPoint;
}

export interface City01TilemapRenderOptions {
  world: TileWorldSceneState;
  layers: WorldLayers;
  diagnostics: boolean;
  project(point: ScenePoint): ScreenPoint;
}

const grassColors = [0x426c50, 0x466f53, 0x3f684d, 0x496f54];
const lockedGrassColors = [0x2d493e, 0x304c40, 0x2b463b];
const waterColors = [0x0b5263, 0x0c5869, 0x0a4d5e, 0x0d5b6b];

const polygon = (corners: TileCorners): number[] => [
  corners.top.x, corners.top.y,
  corners.right.x, corners.right.y,
  corners.bottom.x, corners.bottom.y,
  corners.left.x, corners.left.y
];

const cornersFor = (
  center: ScreenPoint,
  basisX: ScreenPoint,
  basisY: ScreenPoint
): TileCorners => ({
  top: {
    x: center.x - (basisX.x + basisY.x) * 0.5,
    y: center.y - (basisX.y + basisY.y) * 0.5
  },
  right: {
    x: center.x + (basisX.x - basisY.x) * 0.5,
    y: center.y + (basisX.y - basisY.y) * 0.5
  },
  bottom: {
    x: center.x + (basisX.x + basisY.x) * 0.5,
    y: center.y + (basisX.y + basisY.y) * 0.5
  },
  left: {
    x: center.x + (-basisX.x + basisY.x) * 0.5,
    y: center.y + (-basisX.y + basisY.y) * 0.5
  }
});

const roadWidth = (laneWidth: 2 | 4 | 6): number => {
  if (laneWidth === 6) return 14;
  if (laneWidth === 4) return 11;
  return 8;
};

const roadEndpoints = (
  center: ScreenPoint,
  basisX: ScreenPoint,
  basisY: ScreenPoint
): Record<RoadDirection, ScreenPoint> => ({
  [RoadDirection.North]: {
    x: center.x - basisY.x * 0.54,
    y: center.y - basisY.y * 0.54
  },
  [RoadDirection.East]: {
    x: center.x + basisX.x * 0.54,
    y: center.y + basisX.y * 0.54
  },
  [RoadDirection.South]: {
    x: center.x + basisY.x * 0.54,
    y: center.y + basisY.y * 0.54
  },
  [RoadDirection.West]: {
    x: center.x - basisX.x * 0.54,
    y: center.y - basisX.y * 0.54
  }
});

const entryDirection = (cell: TileWorldCellSceneState): RoadDirection | undefined => {
  if (cell.roadEntryEdge === 'north') return RoadDirection.North;
  if (cell.roadEntryEdge === 'east') return RoadDirection.East;
  if (cell.roadEntryEdge === 'south') return RoadDirection.South;
  if (cell.roadEntryEdge === 'west') return RoadDirection.West;
  return undefined;
};

const effectiveRoadMask = (cell: TileWorldCellSceneState): number => {
  const direction = entryDirection(cell);
  return direction === undefined ? cell.roadMask : cell.roadMask | direction;
};

const drawCoastEdge = (
  graphics: Graphics,
  from: ScreenPoint,
  to: ScreenPoint,
  diagnostics: boolean
): void => {
  graphics.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
    color: 0xc7ad72,
    alpha: diagnostics ? 0.95 : 0.72,
    width: diagnostics ? 4.5 : 3.2,
    cap: 'round'
  });
  graphics.moveTo(from.x, from.y + 1.5).lineTo(to.x, to.y + 1.5).stroke({
    color: 0x7cc5bd,
    alpha: 0.28,
    width: 1.2,
    cap: 'round'
  });
};

const drawShoreline = (
  graphics: Graphics,
  corners: TileCorners,
  mask: number,
  diagnostics: boolean
): void => {
  if ((mask & TerrainNeighbor.North) !== 0) {
    drawCoastEdge(graphics, corners.top, corners.right, diagnostics);
  }
  if ((mask & TerrainNeighbor.East) !== 0) {
    drawCoastEdge(graphics, corners.right, corners.bottom, diagnostics);
  }
  if ((mask & TerrainNeighbor.South) !== 0) {
    drawCoastEdge(graphics, corners.bottom, corners.left, diagnostics);
  }
  if ((mask & TerrainNeighbor.West) !== 0) {
    drawCoastEdge(graphics, corners.left, corners.top, diagnostics);
  }

  const diagonalCorners: Array<[number, ScreenPoint]> = [
    [TerrainNeighbor.NorthEast, corners.right],
    [TerrainNeighbor.SouthEast, corners.bottom],
    [TerrainNeighbor.SouthWest, corners.left],
    [TerrainNeighbor.NorthWest, corners.top]
  ];
  for (const [bit, point] of diagonalCorners) {
    if ((mask & bit) === 0) continue;
    graphics.circle(point.x, point.y, diagnostics ? 2.8 : 2)
      .fill({ color: 0xc7ad72, alpha: diagnostics ? 0.86 : 0.48 });
  }
};

const drawRoadCell = (
  curb: Graphics,
  asphalt: Graphics,
  bridge: Graphics,
  cell: TileWorldCellSceneState,
  center: ScreenPoint,
  basisX: ScreenPoint,
  basisY: ScreenPoint,
  diagnostics: boolean
): void => {
  if (!cell.roadLaneWidth) return;
  const mask = effectiveRoadMask(cell);
  const endpoints = roadEndpoints(center, basisX, basisY);
  const width = roadWidth(cell.roadLaneWidth);
  const directions = [
    RoadDirection.North,
    RoadDirection.East,
    RoadDirection.South,
    RoadDirection.West
  ] as const;

  for (const direction of directions) {
    if ((mask & direction) === 0) continue;
    const target = endpoints[direction];
    curb.moveTo(center.x, center.y).lineTo(target.x, target.y).stroke({
      color: cell.terrain === 'water' ? 0xb8c6c2 : 0xb7aa8f,
      alpha: diagnostics ? 0.92 : 0.7,
      width: width + 4,
      cap: 'square'
    });
    asphalt.moveTo(center.x, center.y).lineTo(target.x, target.y).stroke({
      color: cell.terrain === 'water' ? 0x344b50 : 0x303d3f,
      alpha: 0.98,
      width,
      cap: 'square'
    });
  }

  asphalt.circle(center.x, center.y, width * 0.55)
    .fill({ color: cell.terrain === 'water' ? 0x344b50 : 0x303d3f, alpha: 0.98 });

  if (cell.terrain === 'water') {
    bridge.moveTo(center.x - basisX.x * 0.14, center.y - basisX.y * 0.14 + 6)
      .lineTo(center.x - basisX.x * 0.14, center.y - basisX.y * 0.14 + 12)
      .stroke({ color: 0x20363b, alpha: 0.72, width: 2 });
    bridge.moveTo(center.x + basisX.x * 0.14, center.y + basisX.y * 0.14 + 6)
      .lineTo(center.x + basisX.x * 0.14, center.y + basisX.y * 0.14 + 12)
      .stroke({ color: 0x20363b, alpha: 0.72, width: 2 });
  }
};

const drawEntryMarker = (
  layer: Container,
  cell: TileWorldCellSceneState,
  center: ScreenPoint,
  basisX: ScreenPoint,
  basisY: ScreenPoint,
  diagnostics: boolean
): void => {
  const direction = entryDirection(cell);
  if (direction === undefined || !cell.roadEntryId) return;
  const target = roadEndpoints(center, basisX, basisY)[direction];
  const vectorX = target.x - center.x;
  const vectorY = target.y - center.y;
  const length = Math.max(1, Math.hypot(vectorX, vectorY));
  const unitX = vectorX / length;
  const unitY = vectorY / length;
  const sideX = -unitY;
  const sideY = unitX;
  const arrow = new Graphics().poly([
    target.x + unitX * 8, target.y + unitY * 8,
    target.x - unitX * 3 + sideX * 5, target.y - unitY * 3 + sideY * 5,
    target.x - unitX * 3 - sideX * 5, target.y - unitY * 3 - sideY * 5
  ]).fill({ color: 0x9ce8d2, alpha: diagnostics ? 0.92 : 0.5 });
  arrow.zIndex = 20;
  layer.addChild(arrow);

  if (!diagnostics) return;
  const label = new Text({
    text: cell.roadEntryId.replaceAll('-', ' '),
    style: {
      fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: 8,
      fill: 0xcffdf1
    }
  });
  label.anchor.set(0.5);
  label.position.set(target.x + unitX * 24, target.y + unitY * 24);
  label.zIndex = 21;
  layer.addChild(label);
};

export class City01TilemapRenderer {
  static render(options: City01TilemapRenderOptions): void {
    const { world, layers, diagnostics, project } = options;
    const basisX = project(world.basisX);
    const basisY = project(world.basisY);
    const terrain = new Graphics();
    const waterDetail = new Graphics();
    const shore = new Graphics();
    const lockedFog = new Graphics();
    const curb = new Graphics();
    const asphalt = new Graphics();
    const bridge = new Graphics();
    const entries = new Container();
    entries.sortableChildren = true;

    for (const cell of world.cells) {
      const center = project(cell);
      const corners = cornersFor(center, basisX, basisY);
      const shape = polygon(corners);
      if (cell.terrain === 'water') {
        const color = waterColors[cell.variation % waterColors.length] ?? waterColors[0]!;
        terrain.poly(shape).fill({ color, alpha: 1 });
        if (cell.variation % 3 === 0) {
          const from = {
            x: corners.left.x * 0.58 + corners.top.x * 0.42,
            y: corners.left.y * 0.58 + corners.top.y * 0.42
          };
          const to = {
            x: corners.right.x * 0.58 + corners.bottom.x * 0.42,
            y: corners.right.y * 0.58 + corners.bottom.y * 0.42
          };
          waterDetail.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
            color: 0x8ed9dc,
            alpha: 0.12,
            width: 0.8,
            cap: 'round'
          });
        }
      } else {
        const palette = cell.unlocked ? grassColors : lockedGrassColors;
        const color = palette[cell.variation % palette.length] ?? palette[0]!;
        terrain.poly(shape).fill({ color, alpha: 1 });
        if (cell.shoreMask !== 0) drawShoreline(shore, corners, cell.shoreMask, diagnostics);
        if (!cell.unlocked) {
          lockedFog.poly(shape).fill({ color: 0x07171a, alpha: diagnostics ? 0.18 : 0.3 });
        }
      }

      if (diagnostics) {
        terrain.poly(shape).stroke({ color: 0xa7d6c4, alpha: 0.13, width: 0.55 });
      }
      if (cell.roadLaneWidth) {
        drawRoadCell(curb, asphalt, bridge, cell, center, basisX, basisY, diagnostics);
      }
      if (cell.roadEntryId) {
        drawEntryMarker(entries, cell, center, basisX, basisY, diagnostics);
      }
    }

    terrain.zIndex = -900000;
    waterDetail.zIndex = -899900;
    shore.zIndex = -899800;
    lockedFog.zIndex = -899700;
    curb.zIndex = -410000;
    asphalt.zIndex = -409900;
    bridge.zIndex = -409800;
    entries.zIndex = -409700;

    layers.terrain.addChild(terrain, waterDetail, shore, lockedFog);
    layers.roads.addChild(curb, asphalt, bridge, entries);
  }
}
