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
 * Only assets that strengthen the authored city composition are drawn in the world.
 * Road tiles remain registered as reusable construction materials, but the live city
 * uses one continuous vector road network so it does not look like a sticker board.
 */
export const city01EnvironmentPlacements: readonly ProductAssetPlacement[] = [
  {
    assetId: 'terrain_riverfront_base',
    point: { x: 12, z: 48, elevation: -0.42 },
    width: 214,
    layer: 'terrain',
    alpha: 0.9,
    zOffset: -930
  },
  {
    assetId: 'terrain_road_bridge_base',
    point: { x: 22, z: 48, elevation: -0.24 },
    width: 112,
    layer: 'roads',
    alpha: 0.94,
    zOffset: -510
  },
  {
    assetId: 'terrain_seafront_base',
    point: { x: 58, z: 88, elevation: -0.48 },
    width: 318,
    layer: 'terrain',
    alpha: 0.88,
    zOffset: -920
  },
  {
    assetId: 'terrain_beach_open_base',
    point: { x: 76, z: 82, elevation: -0.2 },
    width: 144,
    layer: 'terrain',
    alpha: 0.9,
    zOffset: -680
  },
  {
    assetId: 'terrain_harbor_pier_base',
    point: { x: 37, z: 81, elevation: -0.12 },
    width: 136,
    layer: 'groundDecorations',
    alpha: 0.96,
    zOffset: -220
  },
  {
    assetId: 'terrain_coast_cliff_base',
    point: { x: 94, z: 25, elevation: -0.1 },
    width: 150,
    layer: 'terrain',
    alpha: 0.92,
    zOffset: -700
  },
  {
    assetId: 'terrain_rocky_hill_base',
    point: { x: 73, z: 8, elevation: -0.08 },
    width: 156,
    layer: 'terrain',
    alpha: 0.92,
    zOffset: -690
  },
  {
    assetId: 'terrain_forest_base',
    point: { x: 31, z: 9, elevation: -0.08 },
    width: 158,
    layer: 'terrain',
    alpha: 0.92,
    zOffset: -690
  },
  {
    assetId: 'terrain_park_plaza_base',
    point: { x: 55, z: 48, elevation: -0.02 },
    width: 88,
    layer: 'groundDecorations',
    alpha: 0.94,
    zOffset: -120
  },
  {
    assetId: 'terrain_small_park_base',
    point: { x: 40, z: 62, elevation: -0.01 },
    width: 76,
    layer: 'groundDecorations',
    alpha: 0.92,
    zOffset: -110
  },
  {
    assetId: 'terrain_empty_grasslot_base',
    point: { x: 22, z: 69, elevation: -0.04 },
    width: 84,
    layer: 'terrain',
    alpha: 0.7,
    zOffset: -480
  }
];

export const city01EnvironmentMaterialAssetIds = [
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
    width: 32,
    speed: 0.025,
    phase: 0.08,
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
    width: 40,
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
    width: 36,
    speed: 0.021,
    phase: 0.58,
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
    width: 42,
    speed: 0.019,
    phase: 0.74,
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
    width: 39,
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
