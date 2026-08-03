import { Graphics } from 'pixi.js';
import type { ScenePoint } from '../CitySceneTypes';
import type { WorldLayers } from '../pixi/WorldLayerManager';
import type {
  WorldV2Footprint,
  WorldV2MapContract,
  WorldV2Point,
  WorldV2RoadContract,
  WorldV2TerrainKind
} from './WorldContractsV2';

const terrainColors: Record<WorldV2TerrainKind, number> = {
  water: 0x1d6170,
  grass: 0x5f7d5e,
  coast: 0xb4b18a,
  forest: 0x355d45,
  park: 0x79a16a,
  industrial_ground: 0x6b675b
};

const terrainOrder: Record<WorldV2TerrainKind, number> = {
  water: 0,
  grass: 1,
  coast: 2,
  industrial_ground: 3,
  forest: 4,
  park: 5
};

const roadWidth = (road: WorldV2RoadContract): number => {
  if (road.laneWidth === 6) return 30;
  if (road.laneWidth === 4) return 22;
  return road.kind === 'service' ? 10 : 14;
};

const stableUnit = (seed: string, salt: number): number => {
  let hash = 2166136261;
  const value = `${seed}:${salt}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
};

export const worldV2PointToScene = (
  map: WorldV2MapContract,
  point: WorldV2Point
): ScenePoint => ({
  x: (map.origin.x + point.x * map.cellSize - 50) * 1.02,
  z: (map.origin.z + point.z * map.cellSize - 50) * 0.78,
  elevation: point.elevation ?? 0
});

export const worldV2FootprintCorners = (
  map: WorldV2MapContract,
  footprint: WorldV2Footprint
): ScenePoint[] => {
  const { x, z, elevation = 0 } = footprint.origin;
  return [
    worldV2PointToScene(map, { x, z, elevation }),
    worldV2PointToScene(map, { x: x + footprint.columns, z, elevation }),
    worldV2PointToScene(map, {
      x: x + footprint.columns,
      z: z + footprint.rows,
      elevation
    }),
    worldV2PointToScene(map, { x, z: z + footprint.rows, elevation })
  ];
};

export const worldV2FootprintCenter = (
  map: WorldV2MapContract,
  footprint: WorldV2Footprint
): ScenePoint => worldV2PointToScene(map, {
  x: footprint.origin.x + footprint.columns * 0.5,
  z: footprint.origin.z + footprint.rows * 0.5,
  elevation: footprint.origin.elevation ?? 0
});

const trace = (
  graphics: Graphics,
  points: readonly ScenePoint[],
  project: (point: ScenePoint) => { x: number; y: number }
): void => {
  const first = points[0];
  if (!first) return;
  const start = project(first);
  graphics.moveTo(start.x, start.y);
  for (const point of points.slice(1)) {
    const target = project(point);
    graphics.lineTo(target.x, target.y);
  }
};

const projectedPolygon = (
  points: readonly ScenePoint[],
  project: (point: ScenePoint) => { x: number; y: number }
): number[] => points.flatMap((point) => {
  const projected = project(point);
  return [projected.x, projected.y];
});

const drawTerrainDecorations = (
  map: WorldV2MapContract,
  layers: WorldLayers,
  project: (point: ScenePoint) => { x: number; y: number }
): void => {
  for (const terrain of map.terrain) {
    if (terrain.kind !== 'forest' && terrain.kind !== 'park') continue;
    const count = terrain.kind === 'forest'
      ? Math.max(12, Math.round(terrain.footprint.columns * terrain.footprint.rows * 0.2))
      : Math.max(5, Math.round(terrain.footprint.columns * terrain.footprint.rows * 0.1));
    const decoration = new Graphics();
    decoration.zIndex = 100 + terrainOrder[terrain.kind];
    for (let index = 0; index < count; index += 1) {
      const x = terrain.footprint.origin.x
        + 0.5
        + stableUnit(terrain.id, index * 2) * Math.max(0.5, terrain.footprint.columns - 1);
      const z = terrain.footprint.origin.z
        + 0.5
        + stableUnit(terrain.id, index * 2 + 1) * Math.max(0.5, terrain.footprint.rows - 1);
      const point = project(worldV2PointToScene(map, {
        x,
        z,
        elevation: (terrain.footprint.origin.elevation ?? 0) + 0.04
      }));
      const radius = terrain.kind === 'forest'
        ? 3.2 + stableUnit(terrain.id, index + 200) * 2.8
        : 2.2 + stableUnit(terrain.id, index + 200) * 1.8;
      decoration
        .ellipse(point.x + 2, point.y + 3, radius * 1.15, radius * 0.52)
        .fill({ color: 0x17352a, alpha: 0.2 })
        .circle(point.x, point.y, radius)
        .fill({
          color: terrain.kind === 'forest' ? 0x2c6848 : 0x4f8d59,
          alpha: 0.72
        });
    }
    layers.groundDecorations.addChild(decoration);
  }
};

const drawRoad = (
  map: WorldV2MapContract,
  road: WorldV2RoadContract,
  index: number,
  layers: WorldLayers,
  project: (point: ScenePoint) => { x: number; y: number }
): void => {
  const points = road.points.map((point) => worldV2PointToScene(map, {
    ...point,
    elevation: point.elevation ?? (road.kind === 'bridge' ? 0.12 : 0.04)
  }));
  const width = roadWidth(road);
  const baseDepth = 1000 + index * 10;

  const shadow = new Graphics();
  trace(shadow, points.map((point) => ({ ...point, elevation: point.elevation - 0.04 })), project);
  shadow.stroke({
    color: 0x0a1819,
    alpha: road.kind === 'bridge' ? 0.34 : 0.2,
    width: width + 9,
    cap: 'round',
    join: 'round'
  });
  shadow.zIndex = baseDepth;

  const shoulder = new Graphics();
  trace(shoulder, points, project);
  shoulder.stroke({
    color: road.kind === 'bridge' ? 0xb9b39f : 0xc4bdab,
    alpha: 0.88,
    width: width + 5,
    cap: 'round',
    join: 'round'
  });
  shoulder.zIndex = baseDepth + 1;

  const asphalt = new Graphics();
  trace(asphalt, points, project);
  asphalt.stroke({
    color: road.kind === 'service' ? 0x4c5553 : 0x3b4749,
    alpha: 0.98,
    width,
    cap: 'round',
    join: 'round'
  });
  asphalt.zIndex = baseDepth + 2;

  const centerLine = new Graphics();
  trace(centerLine, points, project);
  centerLine.stroke({
    color: road.kind === 'arterial' || road.kind === 'bridge' ? 0xe9cf74 : 0xe8e3d5,
    alpha: road.kind === 'service' ? 0 : 0.38,
    width: road.laneWidth >= 4 ? 1.7 : 1.1,
    cap: 'round',
    join: 'round'
  });
  centerLine.zIndex = baseDepth + 3;

  layers.roads.addChild(shadow, shoulder, asphalt, centerLine);

  if (road.kind === 'bridge') {
    const railLeft = new Graphics();
    const railRight = new Graphics();
    const screenPoints = points.map(project);
    const first = screenPoints[0];
    const last = screenPoints.at(-1);
    if (first && last) {
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length * (width * 0.62);
      const ny = dx / length * (width * 0.62);
      railLeft.moveTo(first.x + nx, first.y + ny).lineTo(last.x + nx, last.y + ny)
        .stroke({ color: 0xe1dccb, alpha: 0.82, width: 2, cap: 'round' });
      railRight.moveTo(first.x - nx, first.y - ny).lineTo(last.x - nx, last.y - ny)
        .stroke({ color: 0xe1dccb, alpha: 0.82, width: 2, cap: 'round' });
      railLeft.zIndex = baseDepth + 4;
      railRight.zIndex = baseDepth + 4;
      layers.roads.addChild(railLeft, railRight);
    }
  }
};

export class WorldV2MapRenderer {
  static render(options: {
    map: WorldV2MapContract;
    layers: WorldLayers;
    project: (point: ScenePoint) => { x: number; y: number };
    diagnostics: boolean;
  }): void {
    const { map, layers, project, diagnostics } = options;
    const terrain = [...map.terrain].sort((left, right) =>
      terrainOrder[left.kind] - terrainOrder[right.kind]
    );

    for (const [index, region] of terrain.entries()) {
      const corners = worldV2FootprintCorners(map, region.footprint);
      const polygon = projectedPolygon(corners, project);
      if (region.kind === 'grass') {
        const shadowPolygon = polygon.map((value, pointIndex) =>
          pointIndex % 2 === 1 ? value + 17 : value
        );
        const shadow = new Graphics().poly(shadowPolygon)
          .fill({ color: 0x061c1a, alpha: 0.34 });
        shadow.zIndex = index - 20;
        layers.terrain.addChild(shadow);
      }

      const graphics = new Graphics().poly(polygon).fill({
        color: terrainColors[region.kind],
        alpha: region.kind === 'coast' ? 0.9 : 1
      }).stroke({
        color: region.kind === 'water' ? 0x3d8892 : 0xc8d2ad,
        alpha: diagnostics ? 0.34 : region.kind === 'coast' ? 0.28 : 0.1,
        width: diagnostics ? 1.3 : 0.8
      });
      graphics.zIndex = index;
      layers.terrain.addChild(graphics);
    }

    drawTerrainDecorations(map, layers, project);
    map.roads.forEach((road, index) => drawRoad(map, road, index, layers, project));
  }
}
