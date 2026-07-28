import type { ScenePoint } from '../CitySceneTypes';

export type City01MapLayer = 'terrain' | 'roads' | 'groundDecorations' | 'vehicles';

export interface City01MapPlacement {
  id: string;
  assetId: string;
  point: ScenePoint;
  width: number;
  anchorY: number;
  layer: City01MapLayer;
  alpha?: number;
  diagnosticsAlpha?: number;
  flipX?: boolean;
}

const ROAD_TILE_WIDTH = 328;

export const city01MapToScenePoint = (
  x: number,
  y: number,
  elevation = 0
): ScenePoint => ({
  x: (x - 50) * 1.02,
  z: (y - 50) * 0.78,
  elevation
});

export const city01BaseMapPlacement: City01MapPlacement = {
  id: 'city01-base-map',
  assetId: 'city01_map_base',
  point: city01MapToScenePoint(57, 50, -1.4),
  width: 1760,
  anchorY: 0.5,
  layer: 'terrain',
  alpha: 1,
  diagnosticsAlpha: 0.72
};

const roadTile = (
  id: string,
  assetId: string,
  x: number,
  y: number,
  width = ROAD_TILE_WIDTH,
  diagnosticsAlpha = 0.5,
  flipX = false
): City01MapPlacement => ({
  id,
  assetId,
  point: city01MapToScenePoint(x, y, -0.08),
  width,
  anchorY: 0.9115,
  layer: 'roads',
  alpha: 1,
  diagnosticsAlpha,
  flipX
});

const connector = (
  id: string,
  x: number,
  y: number,
  width: number,
  flipX = false
): City01MapPlacement => ({
  id,
  assetId: 'city01_road_connector_short',
  point: city01MapToScenePoint(x, y, -0.02),
  width,
  anchorY: 0.5,
  layer: 'roads',
  alpha: 1,
  diagnosticsAlpha: 0.45,
  flipX
});

const vehicle = (
  id: string,
  assetId: string,
  x: number,
  y: number,
  width: number,
  flipX = false
): City01MapPlacement => ({
  id,
  assetId,
  point: city01MapToScenePoint(x, y, 0.18),
  width,
  anchorY: 0.9,
  layer: 'vehicles',
  diagnosticsAlpha: 0,
  flipX
});

/**
 * Temporary compatibility boundary for the legacy renderer underlay. The new
 * visible L0 surface is city01BaseMapPlacement; no external coast or terrain
 * tile is allowed to define the island silhouette.
 */
export const city01IslandBoundary: readonly ScenePoint[] = [
  city01MapToScenePoint(20, 18, -0.34),
  city01MapToScenePoint(72, 12, -0.34),
  city01MapToScenePoint(96, 31, -0.34),
  city01MapToScenePoint(96, 67, -0.34),
  city01MapToScenePoint(80, 87, -0.34),
  city01MapToScenePoint(34, 90, -0.34),
  city01MapToScenePoint(10, 68, -0.34),
  city01MapToScenePoint(11, 40, -0.34)
];

/**
 * L0 is one complete base map. L1 contains only road art and small vehicles.
 * Coast, ocean, grass lots, parks and forests are no longer assembled from
 * separate large tiles in the live scene.
 */
export const city01MapPlacements: readonly City01MapPlacement[] = [
  city01BaseMapPlacement,
  roadTile('west-bridge', 'terrain_road_bridge_base', 27, 50, ROAD_TILE_WIDTH, 0.48),
  roadTile('central-crossroad', 'terrain_road_crossroad_base', 55, 40, ROAD_TILE_WIDTH, 0.5),
  roadTile('north-east-corner', 'terrain_road_corner_base', 75, 40, ROAD_TILE_WIDTH, 0.48, true),
  roadTile('old-town-straight', 'terrain_road_straight_base', 35, 60, ROAD_TILE_WIDTH, 0.48),
  roadTile('central-t-junction', 'terrain_road_t_junction_base', 55, 60, ROAD_TILE_WIDTH, 0.5),
  roadTile('industrial-straight', 'terrain_road_straight_base', 75, 60, ROAD_TILE_WIDTH, 0.48),
  roadTile('storage-dead-end', 'terrain_road_dead_end_base', 75, 80, ROAD_TILE_WIDTH, 0.46),
  connector('industrial-short-link', 67, 68, 176),
  connector('wind-farm-short-link', 88, 49, 148, true),
  vehicle('city-sedan', 'vehicle_sedan', 57, 39, 43),
  vehicle('civic-utility-van', 'vehicle_utility_van', 55, 61, 47, true),
  vehicle('industrial-cargo-truck', 'vehicle_cargo_truck', 74, 66, 54)
];

/**
 * Source inventory remains registered for future cutting and decoration work.
 * Presence here does not mean an asset must be placed in the live map.
 */
export const city01EnvironmentAssetIds = [
  'terrain_forest_base',
  'terrain_park_plaza_base',
  'terrain_riverfront_base',
  'terrain_road_corner_base',
  'terrain_road_crossroad_base',
  'terrain_road_straight_base',
  'terrain_road_t_junction_base',
  'terrain_rocky_hill_base',
  'terrain_seafront_base',
  'terrain_beach_open_base',
  'terrain_coast_cliff_base',
  'terrain_empty_grasslot_base',
  'terrain_harbor_pier_base',
  'terrain_road_bridge_base',
  'terrain_road_dead_end_base',
  'terrain_small_park_base'
] as const;

export const city01RequiredLiveAssetIds = [
  'city01_map_base',
  'terrain_road_bridge_base',
  'terrain_road_corner_base',
  'terrain_road_crossroad_base',
  'terrain_road_straight_base',
  'terrain_road_t_junction_base',
  'terrain_road_dead_end_base',
  'city01_road_connector_short'
] as const;
