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

const TILE_WIDTH = 328;
const EDGE_TILE_WIDTH = 336;

export const city01MapToScenePoint = (
  x: number,
  y: number,
  elevation = 0
): ScenePoint => ({
  x: (x - 50) * 1.02,
  z: (y - 50) * 0.78,
  elevation
});

const tile = (
  id: string,
  assetId: string,
  x: number,
  y: number,
  width: number,
  layer: City01MapLayer,
  alpha = 1,
  diagnosticsAlpha = 0.46,
  flipX = false
): City01MapPlacement => ({
  id,
  assetId,
  point: city01MapToScenePoint(x, y, -0.22),
  width,
  anchorY: 0.9115,
  layer,
  alpha,
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
  point: city01MapToScenePoint(x, y, -0.04),
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
 * One continuous island sits below the product pieces. Coast images are cut at
 * runtime so their original cyan water becomes transparent over the common sea.
 */
export const city01IslandBoundary: readonly ScenePoint[] = [
  city01MapToScenePoint(18, 14, -0.34),
  city01MapToScenePoint(76, 8, -0.34),
  city01MapToScenePoint(102, 30, -0.34),
  city01MapToScenePoint(102, 70, -0.34),
  city01MapToScenePoint(84, 92, -0.34),
  city01MapToScenePoint(30, 96, -0.34),
  city01MapToScenePoint(6, 72, -0.34),
  city01MapToScenePoint(7, 36, -0.34)
];

/**
 * Full product road tiles provide the street network. Two remaining gaps use a
 * real crop of the product straight-road PNG, never a newly drawn gray panel.
 */
export const city01MapPlacements: readonly City01MapPlacement[] = [
  tile('north-west-beach', 'terrain_beach_open_base', 15, 25, EDGE_TILE_WIDTH, 'terrain', 1, 0.34),
  tile('north-west-forest', 'terrain_forest_base', 41, 9, EDGE_TILE_WIDTH, 'terrain', 1, 0.32),
  tile('north-park', 'terrain_small_park_base', 61, 15, TILE_WIDTH, 'groundDecorations', 1, 0.34),
  tile('north-east-ridge', 'terrain_rocky_hill_base', 94, 28, EDGE_TILE_WIDTH, 'terrain', 1, 0.3),
  tile('west-seafront', 'terrain_seafront_base', 9, 51, EDGE_TILE_WIDTH, 'terrain', 1, 0.32),
  tile('west-harbor', 'terrain_harbor_pier_base', 14, 73, EDGE_TILE_WIDTH, 'terrain', 1, 0.3),
  tile('east-coast', 'terrain_coast_cliff_base', 99, 54, EDGE_TILE_WIDTH, 'terrain', 1, 0.28),
  tile('south-west-coast', 'terrain_coast_cliff_base', 32, 91, EDGE_TILE_WIDTH, 'terrain', 1, 0.28, true),
  tile('south-beach', 'terrain_beach_open_base', 58, 94, EDGE_TILE_WIDTH, 'terrain', 1, 0.28, true),
  tile('south-east-coast', 'terrain_coast_cliff_base', 85, 87, EDGE_TILE_WIDTH, 'terrain', 1, 0.28),
  tile('solar-lot', 'terrain_empty_grasslot_base', 28, 22, TILE_WIDTH, 'terrain', 1, 0.34),
  tile('residential-green', 'terrain_small_park_base', 76, 21, TILE_WIDTH, 'groundDecorations', 0.94, 0.34),
  tile('central-civic-green', 'terrain_park_plaza_base', 53, 58, TILE_WIDTH, 'groundDecorations', 0.96, 0.34),
  tile('storage-lot', 'terrain_empty_grasslot_base', 79, 80, TILE_WIDTH, 'terrain', 1, 0.34),
  tile('east-forest', 'terrain_forest_base', 94, 68, EDGE_TILE_WIDTH, 'terrain', 1, 0.28),
  tile('west-bridge', 'terrain_road_bridge_base', 27, 50, TILE_WIDTH, 'roads', 1, 0.5),
  tile('central-crossroad', 'terrain_road_crossroad_base', 55, 40, TILE_WIDTH, 'roads', 1, 0.52),
  tile('north-east-corner', 'terrain_road_corner_base', 75, 40, TILE_WIDTH, 'roads', 1, 0.5, true),
  tile('old-town-straight', 'terrain_road_straight_base', 35, 60, TILE_WIDTH, 'roads', 1, 0.5),
  tile('central-t-junction', 'terrain_road_t_junction_base', 55, 60, TILE_WIDTH, 'roads', 1, 0.52),
  tile('industrial-straight', 'terrain_road_straight_base', 75, 60, TILE_WIDTH, 'roads', 1, 0.5),
  tile('storage-dead-end', 'terrain_road_dead_end_base', 75, 80, TILE_WIDTH, 'roads', 1, 0.48),
  connector('industrial-short-link', 67, 68, 176),
  connector('wind-farm-short-link', 88, 49, 148, true),
  vehicle('city-sedan', 'vehicle_sedan', 57, 39, 43),
  vehicle('civic-utility-van', 'vehicle_utility_van', 55, 61, 47, true),
  vehicle('industrial-cargo-truck', 'vehicle_cargo_truck', 74, 66, 54)
];

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
  'terrain_forest_base',
  'terrain_park_plaza_base',
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
  'terrain_small_park_base',
  'city01_road_connector_short'
] as const;
