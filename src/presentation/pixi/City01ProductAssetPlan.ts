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

export const city01EnvironmentPlacements: readonly ProductAssetPlacement[] = [
  {
    assetId: 'terrain_riverfront_base',
    point: { x: 9, z: 43, elevation: -0.46 },
    width: 230,
    layer: 'terrain',
    alpha: 0.98,
    zOffset: -950
  },
  {
    assetId: 'terrain_road_bridge_base',
    point: { x: 16, z: 42, elevation: -0.32 },
    width: 132,
    layer: 'roads',
    zOffset: -620
  },
  {
    assetId: 'terrain_seafront_base',
    point: { x: 50, z: 64, elevation: -0.46 },
    width: 292,
    layer: 'terrain',
    alpha: 0.98,
    zOffset: -940
  },
  {
    assetId: 'terrain_beach_open_base',
    point: { x: 70, z: 59, elevation: -0.25 },
    width: 158,
    layer: 'terrain',
    zOffset: -700
  },
  {
    assetId: 'terrain_harbor_pier_base',
    point: { x: 27, z: 57, elevation: -0.18 },
    width: 156,
    layer: 'groundDecorations',
    zOffset: -260
  },
  {
    assetId: 'terrain_coast_cliff_base',
    point: { x: 86, z: 22, elevation: -0.13 },
    width: 178,
    layer: 'terrain',
    zOffset: -760
  },
  {
    assetId: 'terrain_rocky_hill_base',
    point: { x: 69, z: 10, elevation: -0.09 },
    width: 196,
    layer: 'terrain',
    zOffset: -720
  },
  {
    assetId: 'terrain_forest_base',
    point: { x: 31, z: 14, elevation: -0.09 },
    width: 182,
    layer: 'terrain',
    zOffset: -710
  },
  {
    assetId: 'terrain_park_plaza_base',
    point: { x: 56, z: 40, elevation: -0.03 },
    width: 120,
    layer: 'groundDecorations',
    zOffset: -130
  },
  {
    assetId: 'terrain_small_park_base',
    point: { x: 41, z: 54, elevation: -0.02 },
    width: 100,
    layer: 'groundDecorations',
    zOffset: -120
  },
  {
    assetId: 'terrain_empty_grasslot_base',
    point: { x: 19, z: 53, elevation: -0.05 },
    width: 104,
    layer: 'terrain',
    zOffset: -520
  },
  {
    assetId: 'terrain_road_straight_base',
    point: { x: 50, z: 45, elevation: -0.19 },
    width: 114,
    layer: 'roads',
    zOffset: -340
  },
  {
    assetId: 'terrain_road_corner_base',
    point: { x: 31, z: 47, elevation: -0.19 },
    width: 102,
    layer: 'roads',
    zOffset: -330
  },
  {
    assetId: 'terrain_road_t_junction_base',
    point: { x: 48, z: 55, elevation: -0.19 },
    width: 104,
    layer: 'roads',
    zOffset: -330
  },
  {
    assetId: 'terrain_road_crossroad_base',
    point: { x: 68, z: 49, elevation: -0.19 },
    width: 106,
    layer: 'roads',
    zOffset: -330
  },
  {
    assetId: 'terrain_road_dead_end_base',
    point: { x: 82, z: 55, elevation: -0.18 },
    width: 94,
    layer: 'roads',
    zOffset: -320
  }
];

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
    point: { x: 74, z: 51, elevation: 1.05 }
  },
  {
    id: 'grid-technician',
    label: '电网技术员',
    iconAssetId: 'icon_grid_technician',
    point: { x: 67, z: 49, elevation: 1.05 }
  },
  {
    id: 'driver',
    label: '抢修司机',
    iconAssetId: 'icon_driver',
    point: { x: 31, z: 57, elevation: 1.05 }
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
    width: 44,
    speed: 0.025,
    phase: 0.08,
    path: [
      { x: 32, z: 53, elevation: 0.15 },
      { x: 47, z: 38, elevation: 0.15 },
      { x: 63, z: 22, elevation: 0.15 }
    ]
  },
  {
    id: 'cargo-truck',
    label: '货运卡车',
    baseAssetId: 'vehicle_cargo_truck',
    mirroredAssetId: 'vehicle_cargo_truck_mirrored',
    width: 56,
    speed: 0.016,
    phase: 0.36,
    path: [
      { x: 57, z: 56, elevation: 0.15 },
      { x: 68, z: 45, elevation: 0.15 },
      { x: 79, z: 34, elevation: 0.15 }
    ]
  },
  {
    id: 'utility-van',
    label: '市政工具车',
    baseAssetId: 'vehicle_utility_van',
    mirroredAssetId: 'vehicle_utility_van_mirrored',
    width: 50,
    speed: 0.021,
    phase: 0.58,
    path: [
      { x: 35, z: 55, elevation: 0.15 },
      { x: 48, z: 42, elevation: 0.15 },
      { x: 61, z: 29, elevation: 0.15 }
    ]
  },
  {
    id: 'repair-truck',
    label: '电网抢修车',
    baseAssetId: 'vehicle_repair_truck',
    mirroredAssetId: 'vehicle_repair_truck_mirrored',
    width: 58,
    speed: 0.019,
    phase: 0.74,
    path: [
      { x: 49, z: 58, elevation: 0.17 },
      { x: 61, z: 46, elevation: 0.17 },
      { x: 73, z: 34, elevation: 0.17 }
    ]
  },
  {
    id: 'work-truck',
    label: '工程作业车',
    baseAssetId: 'vehicle_work_truck',
    mirroredAssetId: 'vehicle_work_truck_mirrored',
    width: 56,
    speed: 0.017,
    phase: 0.9,
    path: [
      { x: 39, z: 52, elevation: 0.15 },
      { x: 52, z: 39, elevation: 0.15 },
      { x: 65, z: 26, elevation: 0.15 }
    ]
  }
];

export const allCity01ProductAssetIds: readonly string[] = [
  ...Object.values(city01DistrictAssetIds),
  ...city01FacilityAssetIds,
  ...city01EnvironmentPlacements.map((placement) => placement.assetId),
  ...city01CrewMarkers.map((marker) => marker.iconAssetId),
  ...city01CrewPortraitAssetIds,
  ...city01VehicleDefinitions.flatMap((vehicle) => [vehicle.baseAssetId, vehicle.mirroredAssetId])
];
