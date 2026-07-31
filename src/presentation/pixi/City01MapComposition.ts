import type { ScenePoint } from '../CitySceneTypes';

export type City01MapLayer = 'terrain' | 'roads' | 'groundDecorations' | 'vehicles';

export interface City01MapPlacement {
  id: string;
  assetId: string;
  point: ScenePoint;
  width: number;
  anchorY: number;
  layer: City01MapLayer;
  /** Illustration/showcase opacity. */
  alpha?: number;
  /** Default player-facing game opacity. */
  gameAlpha?: number;
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

const backgroundPoint = city01MapToScenePoint(57, 50, -1.4);

export const city01LandPlacement: City01MapPlacement = {
  id: 'city01-land-base',
  assetId: 'city01_land_base',
  point: backgroundPoint,
  width: 1760,
  anchorY: 0.5,
  layer: 'terrain',
  alpha: 1,
  gameAlpha: 1,
  diagnosticsAlpha: 0.72
};

export const city01ZoneMaskPlacement: City01MapPlacement = {
  id: 'city01-zone-mask',
  assetId: 'city01_zone_mask',
  point: backgroundPoint,
  width: 1760,
  anchorY: 0.5,
  layer: 'groundDecorations',
  alpha: 0,
  gameAlpha: 1,
  diagnosticsAlpha: 0.32
};

export const city01RoadThinPlacement: City01MapPlacement = {
  id: 'city01-road-thin',
  assetId: 'city01_road_thin',
  point: backgroundPoint,
  width: 1760,
  anchorY: 0.5,
  layer: 'roads',
  alpha: 0.82,
  gameAlpha: 1,
  diagnosticsAlpha: 0.42
};

export const city01DecorDetailsPlacement: City01MapPlacement = {
  id: 'city01-decor-details',
  assetId: 'city01_decor_details',
  point: backgroundPoint,
  width: 1760,
  anchorY: 0.5,
  layer: 'groundDecorations',
  alpha: 0.82,
  gameAlpha: 0.86,
  diagnosticsAlpha: 0.18
};

/**
 * Compatibility aliases for callers written against the previous three-layer
 * authored background. They now resolve to the split gameplay layers.
 */
export const city01BaseMapPlacement = city01LandPlacement;
export const city01RoadNetworkPlacement = city01RoadThinPlacement;
export const city01GroundDetailsPlacement = city01DecorDetailsPlacement;

/**
 * Static authored surfaces only. Logical districts, plots, facilities, roads
 * and energy topology belong to LevelSceneLayoutRegistry and scene state.
 */
export const city01StaticBackgroundPlacements: readonly City01MapPlacement[] = [
  city01LandPlacement,
  city01ZoneMaskPlacement,
  city01RoadThinPlacement,
  city01DecorDetailsPlacement
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
  alpha: 0.9,
  gameAlpha: 0.78,
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

/** Diagnostic-only island boundary used by the grid/editor renderer. */
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

/** Source inventory only; none of these IDs is a live City-01 map placement. */
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

/** Complete live static asset contract, including the ocean underlay. */
export const city01RequiredLiveAssetIds = [
  'city01_land_base',
  'city01_zone_mask',
  'city01_road_thin',
  'city01_decor_details',
  'city01_ocean_water_base'
] as const;
