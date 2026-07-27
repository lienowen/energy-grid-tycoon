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
}

const TILE_WIDTH = 328;
const EDGE_TILE_WIDTH = 336;

const tile = (
  id: string,
  assetId: string,
  x: number,
  z: number,
  width: number,
  layer: City01MapLayer,
  alpha = 1,
  diagnosticsAlpha = 0.58
): City01MapPlacement => ({
  id,
  assetId,
  point: { x, z, elevation: -0.22 },
  width,
  anchorY: 0.9115,
  layer,
  alpha,
  diagnosticsAlpha
});

const vehicle = (
  id: string,
  assetId: string,
  x: number,
  z: number,
  width: number
): City01MapPlacement => ({
  id,
  assetId,
  point: { x, z, elevation: 0.18 },
  width,
  anchorY: 0.9,
  layer: 'vehicles',
  diagnosticsAlpha: 0
});

/**
 * The product tiles have an 800px authored footprint inside a 1024px canvas.
 * At a 20-unit isometric grid step, a 328px display width makes neighbouring
 * diamond footprints meet edge-to-edge instead of floating as separate cards.
 */
export const city01MapPlacements: readonly City01MapPlacement[] = [
  tile('north-forest', 'terrain_forest_base', 55, 4, EDGE_TILE_WIDTH, 'terrain', 1, 0.42),
  tile('north-solar-lot', 'terrain_empty_grasslot_base', 35, 20, TILE_WIDTH, 'terrain', 1, 0.42),
  tile('north-park', 'terrain_small_park_base', 55, 20, TILE_WIDTH, 'terrain', 1, 0.45),
  tile('north-road-corner', 'terrain_road_corner_base', 75, 20, TILE_WIDTH, 'roads', 1, 0.58),
  tile('east-ridge', 'terrain_rocky_hill_base', 95, 28, EDGE_TILE_WIDTH, 'terrain', 1, 0.4),

  tile('west-beach', 'terrain_beach_open_base', 15, 38, EDGE_TILE_WIDTH, 'terrain', 1, 0.42),
  tile('west-main-road', 'terrain_road_straight_base', 35, 40, TILE_WIDTH, 'roads', 1, 0.58),
  tile('central-crossroad', 'terrain_road_crossroad_base', 55, 40, TILE_WIDTH, 'roads', 1, 0.62),
  tile('east-junction', 'terrain_road_t_junction_base', 75, 40, TILE_WIDTH, 'roads', 1, 0.6),
  tile('east-cliff', 'terrain_coast_cliff_base', 95, 47, EDGE_TILE_WIDTH, 'terrain', 1, 0.42),

  tile('west-seafront', 'terrain_seafront_base', 15, 60, EDGE_TILE_WIDTH, 'terrain', 1, 0.42),
  tile('west-riverfront', 'terrain_riverfront_base', 35, 60, TILE_WIDTH, 'terrain', 1, 0.48),
  tile('central-civic-park', 'terrain_park_plaza_base', 55, 60, TILE_WIDTH, 'groundDecorations', 1, 0.48),
  tile('east-bridge', 'terrain_road_bridge_base', 75, 60, TILE_WIDTH, 'roads', 1, 0.58),
  tile('east-forest', 'terrain_forest_base', 95, 67, EDGE_TILE_WIDTH, 'terrain', 1, 0.36),

  tile('south-harbor', 'terrain_harbor_pier_base', 15, 82, EDGE_TILE_WIDTH, 'terrain', 1, 0.38),
  tile('south-dead-end', 'terrain_road_dead_end_base', 35, 80, TILE_WIDTH, 'roads', 1, 0.5),
  tile('south-park', 'terrain_small_park_base', 55, 80, TILE_WIDTH, 'groundDecorations', 1, 0.42),
  tile('south-storage-lot', 'terrain_empty_grasslot_base', 75, 80, TILE_WIDTH, 'terrain', 1, 0.4),
  tile('south-east-coast', 'terrain_coast_cliff_base', 95, 84, EDGE_TILE_WIDTH, 'terrain', 1, 0.34),

  vehicle('city-sedan', 'vehicle_sedan', 56, 39, 43),
  vehicle('civic-utility-van', 'vehicle_utility_van', 55, 61, 47),
  vehicle('industrial-cargo-truck', 'vehicle_cargo_truck', 73, 68, 54)
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
