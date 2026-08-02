import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type {
  ScenePoint,
  TileWorldCellSceneState,
  TileWorldSceneState
} from '../CitySceneTypes';
import { CITY01_ART_V2 } from '../art-v2/City01ArtV2Theme';
import {
  resolveCity01TerrainFrame,
  resolveCity01WaterFrame
} from '../world-grid/City01TerrainTileRegistry';
import type { WorldLayers } from './WorldLayerManager';
import { RoadDirection } from './generation/RoadAutoTiler';
import { City01TerrainAtlas } from './City01TerrainAtlas';

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

const THEME = CITY01_ART_V2;

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

const frameNameForCell = (cell: TileWorldCellSceneState): string =>
  cell.terrain === 'water'
    ? resolveCity01WaterFrame(cell.variation)
    : resolveCity01TerrainFrame(cell.shoreMask, cell.variation);

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

const drawRoadCell = (
  curb: Graphics,
  asphalt: Graphics,
  markings: Graphics,
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
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length;
    const uy = dy / length;
    const roadColor = cell.terrain === 'water'
      ? THEME.palette.road.bridgeAsphalt
      : THEME.palette.road.asphalt;

    curb.moveTo(center.x, center.y).lineTo(target.x, target.y).stroke({
      color: THEME.palette.road.shoulder,
      alpha: diagnostics ? THEME.road.diagnosticAlpha : 0.66,
      width: width + THEME.road.shoulderExtraWidth,
      cap: 'square'
    });
    asphalt.moveTo(center.x, center.y).lineTo(target.x, target.y).stroke({
      color: roadColor,
      alpha: THEME.road.normalAlpha,
      width,
      cap: 'square'
    });
    markings
      .moveTo(center.x + ux * width * 0.36, center.y + uy * width * 0.36)
      .lineTo(target.x - ux * 3, target.y - uy * 3)
      .stroke({
        color: THEME.palette.road.centerLine,
        alpha: diagnostics ? 0.7 : THEME.road.centerLineAlpha,
        width: THEME.road.centerLineWidth,
        cap: 'round'
      });
  }

  asphalt.circle(center.x, center.y, width * 0.55)
    .fill({
      color: cell.terrain === 'water'
        ? THEME.palette.road.bridgeAsphalt
        : THEME.palette.road.asphalt,
      alpha: THEME.road.normalAlpha
    });

  if (cell.terrain === 'water') {
    bridge.moveTo(center.x - basisX.x * 0.14, center.y - basisX.y * 0.14 + 6)
      .lineTo(center.x - basisX.x * 0.14, center.y - basisX.y * 0.14 + 12)
      .stroke({ color: THEME.palette.road.bridgeRail, alpha: 0.78, width: 2 });
    bridge.moveTo(center.x + basisX.x * 0.14, center.y + basisX.y * 0.14 + 6)
      .lineTo(center.x + basisX.x * 0.14, center.y + basisX.y * 0.14 + 12)
      .stroke({ color: THEME.palette.road.bridgeRail, alpha: 0.78, width: 2 });
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
  ]).fill({
    color: THEME.palette.status.positive,
    alpha: diagnostics ? 0.92 : 0.52
  });
  arrow.zIndex = 20;
  layer.addChild(arrow);

  if (!diagnostics) return;
  const label = new Text({
    text: cell.roadEntryId.replaceAll('-', ' '),
    style: {
      fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: 8,
      fill: THEME.palette.ui.textPrimary
    }
  });
  label.anchor.set(0.5);
  label.position.set(target.x + unitX * 24, target.y + unitY * 24);
  label.zIndex = 21;
  layer.addChild(label);
};

const terrainTint = (cell: TileWorldCellSceneState): number => {
  if (cell.terrain === 'water') return THEME.palette.terrain.waterTint;
  if (!cell.unlocked) return THEME.palette.terrain.lockedTint;
  return THEME.palette.terrain.landTint;
};

const addTerrainSprites = (
  container: Container,
  cells: readonly TileWorldCellSceneState[],
  textures: Readonly<Record<string, Texture>>,
  project: (point: ScenePoint) => ScreenPoint,
  tileWidth: number,
  tileHeight: number
): void => {
  for (const cell of cells) {
    const texture = textures[frameNameForCell(cell)];
    if (!texture) continue;
    const center = project(cell);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(center.x, center.y);
    sprite.width = tileWidth + THEME.terrain.spriteOverscanX;
    sprite.height = tileHeight + THEME.terrain.spriteOverscanY;
    sprite.tint = terrainTint(cell);
    sprite.zIndex = cell.gridX + cell.gridY;
    container.addChild(sprite);
  }
  container.sortChildren();
};

const drawSparseWaterHighlight = (
  graphics: Graphics,
  cell: TileWorldCellSceneState,
  center: ScreenPoint,
  tileWidth: number,
  tileHeight: number
): void => {
  if (cell.terrain !== 'water') return;
  const seed = Math.abs(cell.gridX * 17 + cell.gridY * 31);
  if (seed % THEME.terrain.sparseWaterHighlightModulo !== 0) return;
  graphics
    .moveTo(center.x - tileWidth * 0.16, center.y - tileHeight * 0.03)
    .lineTo(center.x + tileWidth * 0.08, center.y - tileHeight * 0.09)
    .stroke({
      color: THEME.palette.ocean.highlight,
      alpha: THEME.terrain.sparseWaterHighlightAlpha,
      width: 1.1,
      cap: 'round'
    });
};

export class City01TilemapRenderer {
  static render(options: City01TilemapRenderOptions): void {
    const { world, layers, diagnostics, project } = options;
    const basisX = project(world.basisX);
    const basisY = project(world.basisY);
    const tileWidth = Math.max(1, Math.abs(basisX.x - basisY.x));
    const tileHeight = Math.max(1, Math.abs(basisX.y + basisY.y));

    const fallbackTerrain = new Graphics();
    const terrainSprites = new Container();
    const waterHighlights = new Graphics();
    const diagnosticsGrid = new Graphics();
    const curb = new Graphics();
    const asphalt = new Graphics();
    const roadMarkings = new Graphics();
    const bridge = new Graphics();
    const entries = new Container();
    terrainSprites.sortableChildren = true;
    entries.sortableChildren = true;

    for (const cell of world.cells) {
      const center = project(cell);
      const corners = cornersFor(center, basisX, basisY);
      const shape = polygon(corners);
      const fallbackColor = cell.terrain === 'water'
        ? THEME.palette.ocean.shallow
        : cell.unlocked
          ? THEME.palette.terrain.grassFallback
          : THEME.palette.terrain.lockedFallback;
      fallbackTerrain.poly(shape).fill({ color: fallbackColor, alpha: 1 });
      drawSparseWaterHighlight(waterHighlights, cell, center, tileWidth, tileHeight);

      if (diagnostics) {
        diagnosticsGrid.poly(shape).stroke({
          color: THEME.palette.terrain.diagnosticGrid,
          alpha: 0.16,
          width: 0.6
        });
      }
      if (cell.roadLaneWidth) {
        drawRoadCell(
          curb,
          asphalt,
          roadMarkings,
          bridge,
          cell,
          center,
          basisX,
          basisY,
          diagnostics
        );
      }
      if (cell.roadEntryId) {
        drawEntryMarker(entries, cell, center, basisX, basisY, diagnostics);
      }
    }

    fallbackTerrain.zIndex = -900100;
    terrainSprites.zIndex = -900000;
    waterHighlights.zIndex = -899850;
    diagnosticsGrid.zIndex = -899600;
    curb.zIndex = -410000;
    asphalt.zIndex = -409900;
    roadMarkings.zIndex = -409850;
    bridge.zIndex = -409800;
    entries.zIndex = -409700;

    layers.terrain.addChild(
      fallbackTerrain,
      terrainSprites,
      waterHighlights,
      diagnosticsGrid
    );
    layers.roads.addChild(curb, asphalt, roadMarkings, bridge, entries);

    void City01TerrainAtlas.load()
      .then((textures) => {
        if (!terrainSprites.parent) return;
        addTerrainSprites(terrainSprites, world.cells, textures, project, tileWidth, tileHeight);
      })
      .catch((error: unknown) => {
        console.error('City-01 terrain atlas failed to load:', error);
      });
  }
}
