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
  alpha: 1,
  diagnosticsAlpha: 0.26
};

const urbanBlock = (
  id: string,
  district: 'residential' | 'commercial' | 'industrial' | 'public' | 'old_town',
  x: number,
  y: number,
  width: number,
  alpha: number,
  flipX = false
): City01MapPlacement => ({
  id: `urban-${id}`,
  assetId: `commercial_district_${district}_night`,
  point: city01MapToScenePoint(x, y, 0.06),
  width,
  anchorY: 0.9115,
  layer: 'groundDecorations',
  alpha,
  diagnosticsAlpha: 0.12,
  flipX
});

/**
 * Secondary street blocks turn the five landmark prefabs into one city. They
 * deliberately sit below the interactive districts and facilities, so they
 * provide density without stealing clicks or becoming gameplay objects.
 */
export const city01UrbanFabricPlacements: readonly City01MapPlacement[] = [
  urbanBlock('northwest-apartments', 'residential', 36, 43, 136, 0.72, true),
  urbanBlock('north-market', 'commercial', 48, 34, 152, 0.82),
  urbanBlock('north-courts', 'residential', 57, 34, 138, 0.74, true),
  urbanBlock('northeast-apartments', 'residential', 77, 36, 134, 0.7),
  urbanBlock('west-high-street', 'old_town', 45, 45, 142, 0.78, true),
  urbanBlock('civic-west', 'public', 51, 43, 148, 0.8),
  urbanBlock('central-offices', 'commercial', 60, 43, 158, 0.84, true),
  urbanBlock('residential-link', 'residential', 67, 45, 142, 0.76),
  urbanBlock('east-shops', 'commercial', 74, 46, 144, 0.76, true),
  urbanBlock('old-town-gate', 'old_town', 34, 54, 136, 0.74),
  urbanBlock('west-courtyard', 'old_town', 45, 54, 144, 0.8, true),
  urbanBlock('civic-south', 'public', 51, 59, 150, 0.82),
  urbanBlock('central-mixed-use', 'commercial', 59, 58, 158, 0.84, true),
  urbanBlock('east-mixed-use', 'residential', 65, 55, 142, 0.76),
  urbanBlock('industrial-gate', 'industrial', 75, 54, 148, 0.76, true),
  urbanBlock('old-town-south', 'old_town', 48, 67, 148, 0.8),
  urbanBlock('south-housing', 'residential', 57, 67, 140, 0.72, true),
  urbanBlock('south-workshops', 'industrial', 64, 63, 154, 0.8),
  urbanBlock('logistics-west', 'industrial', 74, 60, 150, 0.78, true),
  urbanBlock('logistics-east', 'industrial', 78, 69, 142, 0.72)
];

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
 * L0 and L1 define the aligned authored surface. The urban fabric below the
 * landmark districts adds visual continuity only; interaction remains owned by
 * the five district prefabs, facilities and build plots.
 */
export const city01MapPlacements: readonly City01MapPlacement[] = [
  city01BaseMapPlacement,
  city01RoadNetworkPlacement,
  city01GroundDetailsPlacement,
  ...city01UrbanFabricPlacements,
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

export const city01RequiredLiveAssetIds = [
  'city01_map_base',
  'city01_road_network_base',
  'city01_ground_details_base'
] as const;
