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
    point: { x: 8, z: 47, elevation: -0.48 },
    width: 238,
    layer: 'terrain',
    alpha: 0.98,
    zOffset: -950
  },
  {
    assetId: 'terrain_road_bridge_base',
    point: { x: 15, z: 44, elevation: -0.34 },
    width: 136,
    layer: 'roads',
    zOffset: -620
  },
  {
    assetId: 'terrain_seafront_base',
    point: { x: 50, z: 79, elevation: -0.5 },
    width: 312,
    layer: 'terrain',
    alpha: 0.98,
    zOffset: -940
  },
  {
    assetId: 'terrain_beach_open_base',
    point: { x: 70, z: 73, elevation: -0.28 },
    width: 168,
    layer: 'terrain',
    zOffset: -700
  },
  {
    assetId: 'terrain_harbor_pier_base',
    point: { x: 27, z: 70, elevation: -0.2 },
    width: 164,
    layer: 'groundDecorations',
    zOffset: -260
  },
  {
    assetId: 'terrain_coast_cliff_base',
    point: { x: 87, z: 21, elevation: -0.14 },
    width: 184,
    layer: 'terrain',
    zOffset: -760
  },
  {
    assetId: 'terrain_rocky_hill_base',
    point: { x: 70, z: 9, elevation: -0.1 },
    width: 204,
    layer: 'terrain',
    zOffset: -720
  },
  {
    assetId: 'terrain_forest_base',
    point: { x: 31, z: 13, elevation: -0.1 },
    width: 188,
    layer: 'terrain',
    zOffset: -710
  },
  {
    assetId: 'terrain_park_plaza_base',
    point: { x: 56, z: 41, elevation: -0.04 },
    width: 124,
    layer: 'groundDecorations',
    zOffset: -130
  },
  {
    assetId: 'terrain_small_park_base',
    point: { x: 42, z: 62, elevation: -0.03 },
    width: 104,
    layer: 'groundDecorations',
    zOffset: -120
  },
  {
    assetId: 'terrain_empty_grasslot_base',
    point: { x: 18, z: 61, elevation: -0.06 },
    width: 108,
    layer: 'terrain',
    zOffset: -520
  },
  {
    assetId: 'terrain_road_straight_base',
    point: { x: 50, z: 46, elevation: -0.2 },
    width: 118,
    layer: 'roads',
    zOffset: -340
  },
  {
    assetId: 'terrain_road_corner_base',
    point: { x: 31, z: 48, elevation: -0.2 },
    width: 106,
    layer: 'roads',
    zOffset: -330
  },
  {
    assetId: 'terrain_road_t_junction_base',
    point: { x: 48, z: 61, elevation: -0.2 },
    width: 108,
    layer: 'roads',
    zOffset: -330
  },
  {
    assetId: 'terrain_road_crossroad_base',
    point: { x: 68, z: 50, elevation: -0.2 },
    width: 110,
    layer: 'roads',
    zOffset: -330
  },
  {
    assetId: 'terrain_road_dead_end_base',
    point: { x: 84, z: 61, elevation: -0.19 },
    width: 98,
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
    point: { x: 75, z: 53, elevation: 1.05 }
  },
  {
    id: 'grid-technician',
    label: '电网技术员',
    iconAssetId: 'icon_grid_technician',
    point: { x: 68, z: 51, elevation: 1.05 }
  },
  {
    id: 'driver',
    label: '抢修司机',
    iconAssetId: 'icon_driver',
    point: { x: 29, z: 68, elevation: 1.05 }
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
    width: 46,
    speed: 0.025,
    phase: 0.08,
    path: [
      { x: 32, z: 58, elevation: 0.16 },
      { x: 48, z: 42, elevation: 0.16 },
      { x: 65, z: 25, elevation: 0.16 }
    ]
  },
  {
    id: 'cargo-truck',
    label: '货运卡车',
    baseAssetId: 'vehicle_cargo_truck',
    mirroredAssetId: 'vehicle_cargo_truck_mirrored',
    width: 60,
    speed: 0.016,
    phase: 0.36,
    path: [
      { x: 57, z: 65, elevation: 0.16 },
      { x: 69, z: 53, elevation: 0.16 },
      { x: 81, z: 41, elevation: 0.16 }
    ]
  },
  {
    id: 'utility-van',
    label: '市政工具车',
    baseAssetId: 'vehicle_utility_van',
    mirroredAssetId: 'vehicle_utility_van_mirrored',
    width: 54,
    speed: 0.021,
    phase: 0.58,
    path: [
      { x: 34, z: 61, elevation: 0.16 },
      { x: 48, z: 47, elevation: 0.16 },
      { x: 62, z: 33, elevation: 0.16 }
    ]
  },
  {
    id: 'repair-truck',
    label: '电网抢修车',
    baseAssetId: 'vehicle_repair_truck',
    mirroredAssetId: 'vehicle_repair_truck_mirrored',
    width: 62,
    speed: 0.019,
    phase: 0.74,
    path: [
      { x: 50, z: 66, elevation: 0.18 },
      { x: 62, z: 54, elevation: 0.18 },
      { x: 75, z: 41, elevation: 0.18 }
    ]
  },
  {
    id: 'work-truck',
    label: '工程作业车',
    baseAssetId: 'vehicle_work_truck',
    mirroredAssetId: 'vehicle_work_truck_mirrored',
    width: 60,
    speed: 0.017,
    phase: 0.9,
    path: [
      { x: 39, z: 57, elevation: 0.16 },
      { x: 53, z: 43, elevation: 0.16 },
      { x: 67, z: 29, elevation: 0.16 }
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
