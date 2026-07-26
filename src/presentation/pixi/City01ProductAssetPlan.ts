import type { DistrictPrefabKind } from '../layout/LevelSceneLayout';
import type { ScenePoint } from '../CitySceneTypes';

export type ProductAssetLayer = 'terrain' | 'roads' | 'groundDecorations';

export interface ProductAssetPlacement {
  assetId: string;
  point: ScenePoint;
  width: number;
  layer: ProductAssetLayer;
  anchorY?: number;
  alpha?: number;
  zOffset?: number;
}

export interface ProductCrewMarker {
  id: string;
  label: string;
  iconAssetId: string;
  point: ScenePoint;
  worldVisible?: boolean;
}

export interface ProductVehicleDefinition {
  id: string;
  label: string;
  baseAssetId: string;
  mirroredAssetId: string;
  width: number;
  speed: number;
  phase: number;
  path: readonly ScenePoint[];
  worldVisible?: boolean;
}

export const city01DistrictAssetIds: Record<DistrictPrefabKind, string> = {
  residential: 'district_residential_base',
  commercial: 'district_commercial_base',
  industrial: 'district_industrial_base',
  public: 'district_public_base',
  old_town: 'district_old_town_base'
};

export const city01FacilityAssetIds = [
  'facility_solar_farm_base',
  'facility_wind_farm_base',
  'facility_gas_peaker_base',
  'facility_battery_storage_base',
  'facility_main_substation_base',
  'facility_distribution_node_base'
] as const;

export const city01FacilityAssetFor = (configId: string): string | undefined => {
  if (configId.includes('solar')) return 'facility_solar_farm_base';
  if (configId.includes('wind')) return 'facility_wind_farm_base';
  if (configId.includes('gas')) return 'facility_gas_peaker_base';
  if (configId.includes('battery') || configId.includes('storage')) return 'facility_battery_storage_base';
  return undefined;
};

/**
 * The submitted environment tiles currently contain opaque rectangular backgrounds.
 * Rendering them over the city hides the continuous island and recreates the rejected
 * sticker-board composition. They remain registered as reusable source materials but
 * are intentionally not drawn in the live world until production-transparent masters exist.
 */
export const city01EnvironmentPlacements: readonly ProductAssetPlacement[] = [];

export const city01EnvironmentMaterialAssetIds = [
  'terrain_riverfront_base',
  'terrain_road_bridge_base',
  'terrain_seafront_base',
  'terrain_beach_open_base',
  'terrain_harbor_pier_base',
  'terrain_coast_cliff_base',
  'terrain_rocky_hill_base',
  'terrain_forest_base',
  'terrain_park_plaza_base',
  'terrain_small_park_base',
  'terrain_empty_grasslot_base',
  'terrain_road_straight_base',
  'terrain_road_corner_base',
  'terrain_road_t_junction_base',
  'terrain_road_crossroad_base',
  'terrain_road_dead_end_base'
] as const;

export const city01CrewMarkers: readonly ProductCrewMarker[] = [
  {
    id: 'engineer-male',
    label: '系统工程师',
    iconAssetId: 'icon_engineer_male',
    point: { x: 57, z: 43, elevation: 1.1 }
  },
  {
    id: 'engineer-female',
    label: '新能源工程师',
    iconAssetId: 'icon_engineer_female',
    point: { x: 23, z: 27, elevation: 1.05 }
  },
  {
    id: 'maintenance-worker',
    label: '线路维修工',
    iconAssetId: 'icon_maintenance_worker',
    point: { x: 75, z: 51, elevation: 1.05 },
    worldVisible: true
  },
  {
    id: 'grid-technician',
    label: '电网技术员',
    iconAssetId: 'icon_grid_technician',
    point: { x: 59, z: 45, elevation: 1.05 },
    worldVisible: true
  },
  {
    id: 'driver',
    label: '抢修司机',
    iconAssetId: 'icon_driver',
    point: { x: 68, z: 57, elevation: 1.05 },
    worldVisible: true
  }
];

export const city01CrewPortraitAssetIds = [
  'portrait_engineer_male',
  'portrait_engineer_female',
  'portrait_maintenance_worker',
  'portrait_grid_technician',
  'portrait_driver'
] as const;

export const city01VehicleDefinitions: readonly ProductVehicleDefinition[] = [
  {
    id: 'commuter-sedan',
    label: '巡检轿车',
    baseAssetId: 'vehicle_sedan',
    mirroredAssetId: 'vehicle_sedan_mirrored',
    width: 31,
    speed: 0.025,
    phase: 0.08,
    worldVisible: true,
    path: [
      { x: 29, z: 43, elevation: 0.14 },
      { x: 47, z: 45, elevation: 0.14 },
      { x: 70, z: 45, elevation: 0.14 },
      { x: 86, z: 51, elevation: 0.14 }
    ]
  },
  {
    id: 'cargo-truck',
    label: '货运卡车',
    baseAssetId: 'vehicle_cargo_truck',
    mirroredAssetId: 'vehicle_cargo_truck_mirrored',
    width: 38,
    speed: 0.016,
    phase: 0.36,
    path: [
      { x: 59, z: 64, elevation: 0.14 },
      { x: 73, z: 66, elevation: 0.14 },
      { x: 88, z: 65, elevation: 0.14 }
    ]
  },
  {
    id: 'utility-van',
    label: '市政工具车',
    baseAssetId: 'vehicle_utility_van',
    mirroredAssetId: 'vehicle_utility_van_mirrored',
    width: 34,
    speed: 0.021,
    phase: 0.58,
    worldVisible: true,
    path: [
      { x: 42, z: 52, elevation: 0.14 },
      { x: 46, z: 59, elevation: 0.14 },
      { x: 52, z: 66, elevation: 0.14 },
      { x: 58, z: 72, elevation: 0.14 }
    ]
  },
  {
    id: 'repair-truck',
    label: '电网抢修车',
    baseAssetId: 'vehicle_repair_truck',
    mirroredAssetId: 'vehicle_repair_truck_mirrored',
    width: 40,
    speed: 0.019,
    phase: 0.74,
    worldVisible: true,
    path: [
      { x: 57, z: 44, elevation: 0.16 },
      { x: 65, z: 48, elevation: 0.16 },
      { x: 75, z: 51, elevation: 0.16 },
      { x: 84, z: 58, elevation: 0.16 }
    ]
  },
  {
    id: 'work-truck',
    label: '工程作业车',
    baseAssetId: 'vehicle_work_truck',
    mirroredAssetId: 'vehicle_work_truck_mirrored',
    width: 37,
    speed: 0.017,
    phase: 0.9,
    path: [
      { x: 20, z: 68, elevation: 0.14 },
      { x: 33, z: 65, elevation: 0.14 },
      { x: 46, z: 63, elevation: 0.14 },
      { x: 59, z: 64, elevation: 0.14 }
    ]
  }
];

export const allCity01ProductAssetIds: readonly string[] = [
  ...Object.values(city01DistrictAssetIds),
  ...city01FacilityAssetIds,
  ...city01EnvironmentPlacements.map((placement) => placement.assetId),
  ...city01EnvironmentMaterialAssetIds,
  ...city01CrewMarkers.map((marker) => marker.iconAssetId),
  ...city01CrewPortraitAssetIds,
  ...city01VehicleDefinitions.flatMap((vehicle) => [vehicle.baseAssetId, vehicle.mirroredAssetId])
];
