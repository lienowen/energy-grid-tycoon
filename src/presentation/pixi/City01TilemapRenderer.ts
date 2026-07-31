import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type {
  ScenePoint,
  TileWorldCellSceneState,
  TileWorldSceneState
} from '../CitySceneTypes';
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

const fallbackGrassColors = [0x426c50, 0x466f53, 0x3f684d, 0x496f54];
const fallbackLockedColors = [0x2d493e, 0x304c40, 0x2b463b];
const fallbackWaterColors = [0x0b5263, 0x0c5869, 0x0a4d5e, 0x0d5b6b];

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
    sprite.width = tileWidth + 0.35;
    sprite.height = tileHeight + 0.2;
    sprite.zIndex = cell.gridX + cell.gridY;
    container.addChild(sprite);
  }
  container.sortChildren();
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
    const lockedFog = new Graphics();
    const diagnosticsGrid = new Graphics();
    const curb = new Graphics();
    const asphalt = new Graphics();
    const bridge = new Graphics();
    const entries = new Container();
    terrainSprites.sortableChildren = true;
    entries.sortableChildren = true;

    for (const cell of world.cells) {
      const center = project(cell);
      const corners = cornersFor(center, basisX, basisY);
      const shape = polygon(corners);
      if (cell.terrain === 'water') {
        const color = fallbackWaterColors[cell.variation % fallbackWaterColors.length]
          ?? fallbackWaterColors[0]!;
        fallbackTerrain.poly(shape).fill({ color, alpha: 1 });
      } else {
        const palette = cell.unlocked ? fallbackGrassColors : fallbackLockedColors;
        const color = palette[cell.variation % palette.length] ?? palette[0]!;
        fallbackTerrain.poly(shape).fill({ color, alpha: 1 });
        if (!cell.unlocked) {
          lockedFog.poly(shape).fill({ color: 0x07171a, alpha: diagnostics ? 0.18 : 0.3 });
        }
      }

      if (diagnostics) {
        diagnosticsGrid.poly(shape).stroke({ color: 0xa7d6c4, alpha: 0.18, width: 0.6 });
      }
      if (cell.roadLaneWidth) {
        drawRoadCell(curb, asphalt, bridge, cell, center, basisX, basisY, diagnostics);
      }
      if (cell.roadEntryId) {
        drawEntryMarker(entries, cell, center, basisX, basisY, diagnostics);
      }
    }

    fallbackTerrain.zIndex = -900100;
    terrainSprites.zIndex = -900000;
    lockedFog.zIndex = -899700;
    diagnosticsGrid.zIndex = -899600;
    curb.zIndex = -410000;
    asphalt.zIndex = -409900;
    bridge.zIndex = -409800;
    entries.zIndex = -409700;

    layers.terrain.addChild(fallbackTerrain, terrainSprites, lockedFog, diagnosticsGrid);
    layers.roads.addChild(curb, asphalt, bridge, entries);

    const loadedTextures = City01TerrainAtlas.isReady()
      ? City01TerrainAtlas.getTexture('terrain_grass_00')
      : undefined;
    if (loadedTextures) {
      void City01TerrainAtlas.load().then((textures) => {
        if (!terrainSprites.parent) return;
        addTerrainSprites(terrainSprites, world.cells, textures, project, tileWidth, tileHeight);
      });
      return;
    }

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
