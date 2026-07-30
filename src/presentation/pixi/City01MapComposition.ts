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

export const city01RoadNetworkPlacement: City01MapPlacement = {
  id: 'city01-road-network',
  assetId: 'city01_road_network_base',
  point: city01MapToScenePoint(57, 50, -1.4),
  width: 1760,
  anchorY: 0.5,
  layer: 'roads',
  alpha: 1,
  diagnosticsAlpha: 0.48
};

export const city01GroundDetailsPlacement: City01MapPlacement = {
  id: 'city01-ground-details',
  assetId: 'city01_ground_details_base',
  point: city01MapToScenePoint(57, 50, -1.4),
  width: 1760,
  anchorY: 0.5,
  layer: 'groundDecorations',
  alpha: 0.76,
  diagnosticsAlpha: 0.24
};

/**
 * Static authored surfaces only. Logical districts, plots, facilities, roads
 * and energy topology belong to LevelSceneLayoutRegistry and scene state.
 */
export const city01StaticBackgroundPlacements: readonly City01MapPlacement[] = [
  city01BaseMapPlacement,
  city01RoadNetworkPlacement,
  city01GroundDetailsPlacement
];

/**
 * Retained as an empty compatibility export for older callers. City-01 no
 * longer places auxiliary city blocks from the static composition module.
 */
export const city01UrbanFabricPlacements: readonly City01MapPlacement[] = [];
export const city01P0UrbanPlacements = city01UrbanFabricPlacements;

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

export const city01VehiclePlacements: readonly City01MapPlacement[] = [
  vehicle('north-sedan', 'vehicle_sedan', 59, 38, 31),
  vehicle('commercial-sedan', 'vehicle_sedan', 47, 50, 30, true),
  vehicle('civic-utility-van', 'vehicle_utility_van', 58, 56, 35, true),
  vehicle('old-town-sedan', 'vehicle_sedan', 42, 62, 30),
  vehicle('industrial-cargo-truck', 'vehicle_cargo_truck', 74, 70, 40)
];

/**
 * Temporary compatibility boundary for the legacy renderer underlay. The
 * authored background assets remain the visible map authority.
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

export const city01MapPlacements: readonly City01MapPlacement[] = [
  ...city01StaticBackgroundPlacements,
  ...city01VehiclePlacements
];

/**
 * Source inventory remains available for diagnostics and future cutting work.
 * These IDs are not live City-01 map placements.
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

/**
 * The complete live static asset contract. Ocean is rendered by the Pixi world
 * underlay, while the other three entries are placed by this module.
 */
export const city01RequiredLiveAssetIds = [
  'city01_map_base',
  'city01_road_network_base',
  'city01_ground_details_base',
  'city01_ocean_water_base'
] as const;
