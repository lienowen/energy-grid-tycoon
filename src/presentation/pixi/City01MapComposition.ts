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
  alpha: 0.62,
  diagnosticsAlpha: 0.34
};

export const city01GroundDetailsPlacement: City01MapPlacement = {
  id: 'city01-ground-details',
  assetId: 'city01_ground_details_base',
  point: city01MapToScenePoint(57, 50, -1.4),
  width: 1760,
  anchorY: 0.5,
  layer: 'groundDecorations',
  alpha: 0.76,
  diagnosticsAlpha: 0.22
};

const modularPlacement = (
  id: string,
  assetId: string,
  x: number,
  y: number,
  width: number,
  anchorY: number,
  layer: City01MapLayer,
  elevation = 0.04,
  alpha = 1,
  diagnosticsAlpha = 0.12
): City01MapPlacement => ({
  id,
  assetId,
  point: city01MapToScenePoint(x, y, elevation),
  width,
  anchorY,
  layer,
  alpha,
  diagnosticsAlpha
});

/**
 * The four authored P0 road modules reinforce the existing road surface at the
 * exact places where players read the city: the north boulevard, old-town
 * turn, civic T-junction and east-side crossroad. They are used once each so
 * their baked sidewalks, lamps and markings do not repeat visibly.
 */
export const city01P0RoadPlacements: readonly City01MapPlacement[] = [
  modularPlacement('p0-road-straight', 'road_straight_01', 55, 44, 370, 0.5, 'roads', -0.02, 0.94, 0.2),
  modularPlacement('p0-road-corner', 'road_corner_01', 42, 54, 248, 0.5, 'roads', -0.01, 0.96, 0.2),
  modularPlacement('p0-road-t-junction', 'road_t_junction_01', 57, 58, 260, 0.5, 'roads', -0.01, 0.96, 0.2),
  modularPlacement('p0-road-cross', 'road_cross_01', 68, 52, 244, 0.5, 'roads', -0.01, 0.96, 0.2)
];

/**
 * The six non-road assets replace the previous repeated district-prefab filler.
 * Each image has one defined role and appears once: commercial transition,
 * apartment courtyard, office core, suburban edge, pocket park and industrial
 * yard. Interactive landmark districts remain above these visual-only blocks.
 */
export const city01P0UrbanPlacements: readonly City01MapPlacement[] = [
  modularPlacement('p0-commercial-corner', 'commercial_corner_01', 48, 46, 218, 0.91, 'groundDecorations', 0.08, 1, 0.1),
  modularPlacement('p0-apartment-courtyard', 'apartment_courtyard_01', 67, 43, 286, 0.91, 'groundDecorations', 0.08, 1, 0.1),
  modularPlacement('p0-office-campus', 'office_campus_01', 57, 39, 294, 0.91, 'groundDecorations', 0.08, 1, 0.1),
  modularPlacement('p0-suburban-neighborhood', 'suburban_neighborhood_01', 80, 40, 326, 0.91, 'groundDecorations', 0.06, 0.98, 0.08),
  modularPlacement('p0-pocket-park', 'park_pocket_01', 50, 58, 204, 0.82, 'groundDecorations', 0.05, 1, 0.12),
  modularPlacement('p0-industrial-yard', 'industrial_yard_01', 79, 66, 310, 0.91, 'groundDecorations', 0.07, 1, 0.1)
];

export const city01P0AssetPlacements: readonly City01MapPlacement[] = [
  ...city01P0RoadPlacements,
  ...city01P0UrbanPlacements
];

// Compatibility export for tests and callers that still describe these blocks
// as the urban-fabric layer.
export const city01UrbanFabricPlacements = city01P0UrbanPlacements;

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
  ...city01P0AssetPlacements,
  vehicle('north-sedan', 'vehicle_sedan', 55, 38, 40),
  vehicle('commercial-sedan', 'vehicle_sedan', 46, 47, 39, true),
  vehicle('civic-utility-van', 'vehicle_utility_van', 55, 55, 45, true),
  vehicle('east-utility-van', 'vehicle_utility_van', 70, 50, 44),
  vehicle('south-sedan', 'vehicle_sedan', 59, 64, 40),
  vehicle('industrial-cargo-truck', 'vehicle_cargo_truck', 70, 66, 52),
  vehicle('logistics-cargo-truck', 'vehicle_cargo_truck', 77, 61, 50, true)
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

export const city01P0AssetIds = [
  'road_straight_01',
  'road_corner_01',
  'road_t_junction_01',
  'road_cross_01',
  'commercial_corner_01',
  'apartment_courtyard_01',
  'office_campus_01',
  'suburban_neighborhood_01',
  'park_pocket_01',
  'industrial_yard_01'
] as const;

export const city01RequiredLiveAssetIds = [
  'city01_map_base',
  'city01_road_network_base',
  'city01_ground_details_base',
  ...city01P0AssetIds
] as const;
