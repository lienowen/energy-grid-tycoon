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

const urbanFill = (
  id: string,
  assetId: string,
  x: number,
  y: number,
  width: number,
  anchorY: number,
  alpha: number
): City01MapPlacement => ({
  id: `urban-${id}`,
  assetId,
  point: city01MapToScenePoint(x, y, 0.04),
  width,
  anchorY,
  layer: 'groundDecorations',
  alpha,
  diagnosticsAlpha: 0.08
});

/**
 * Visual-only fill modules. They close gaps between the five interactive
 * districts, but never replace landmark districts or define the road network.
 */
export const city01UrbanFabricPlacements: readonly City01MapPlacement[] = [
  urbanFill('commercial-corner', 'commercial_corner_01', 45, 47, 162, 0.91, 0.38),
  urbanFill('apartment-courtyard', 'apartment_courtyard_01', 72, 43, 188, 0.91, 0.34),
  urbanFill('office-campus', 'office_campus_01', 57, 41, 174, 0.91, 0.32),
  urbanFill('suburban-edge', 'suburban_neighborhood_01', 83, 34, 188, 0.91, 0.3),
  urbanFill('pocket-park', 'park_pocket_01', 51, 59, 148, 0.82, 0.36),
  urbanFill('industrial-buffer', 'industrial_yard_01', 78, 69, 190, 0.91, 0.38)
];

// Compatibility name retained for callers introduced with the P0 asset pack.
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

export const city01MapPlacements: readonly City01MapPlacement[] = [
  city01BaseMapPlacement,
  city01RoadNetworkPlacement,
  city01GroundDetailsPlacement,
  ...city01UrbanFabricPlacements,
  vehicle('north-sedan', 'vehicle_sedan', 59, 38, 31),
  vehicle('commercial-sedan', 'vehicle_sedan', 47, 50, 30, true),
  vehicle('civic-utility-van', 'vehicle_utility_van', 58, 56, 35, true),
  vehicle('old-town-sedan', 'vehicle_sedan', 42, 62, 30),
  vehicle('industrial-cargo-truck', 'vehicle_cargo_truck', 74, 70, 40)
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
  'terrain_small_park_base',
  'road_straight_01',
  'road_corner_01',
  'road_t_junction_01',
  'road_cross_01'
] as const;

export const city01RequiredLiveAssetIds = [
  'city01_map_base',
  'city01_road_network_base',
  'city01_ground_details_base',
  ...city01UrbanFabricPlacements.map((placement) => placement.assetId)
] as const;
