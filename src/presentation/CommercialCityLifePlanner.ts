import type {
  CitySceneState,
  DistrictPrefabStatus,
  RoadSceneState,
  ScenePoint
} from './CitySceneTypes';

export type CityFabricTone = 'core' | 'waterfront' | 'service' | 'greenway';
export type CommercialVehicleTone = 'commuter' | 'service' | 'freight';

export interface CityFabricPatch {
  id: string;
  tone: CityFabricTone;
  points: ScenePoint[];
}

export interface CommercialStreetLightPlan {
  id: string;
  point: ScenePoint;
  lit: boolean;
  side: -1 | 1;
}

export interface CommercialVehiclePlan {
  id: string;
  path: ScenePoint[];
  phase: number;
  speed: number;
  tone: CommercialVehicleTone;
  headlights: boolean;
}

export interface CommercialDistrictRecoveryPlan {
  id: string;
  point: ScenePoint;
  width: number;
  depth: number;
  status: DistrictPrefabStatus;
  intensity: number;
  phase: number;
}

export interface CommercialCityLifePlan {
  fabric: CityFabricPatch[];
  streetLights: CommercialStreetLightPlan[];
  vehicles: CommercialVehiclePlan[];
  recovery: CommercialDistrictRecoveryPlan[];
}

const seededUnit = (seed: number, salt: number): number => {
  let value = (seed ^ Math.imul(salt + 1, 0x45d9f3b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

const point = (x: number, z: number, elevation = -0.32): ScenePoint => ({ x, z, elevation });

const dawnCityFabric = (): CityFabricPatch[] => [
  {
    id: 'dawn-core-carpet',
    tone: 'core',
    points: [
      point(27, 19), point(49, 14), point(72, 22), point(91, 39),
      point(95, 61), point(82, 78), point(57, 85), point(34, 78),
      point(20, 61), point(19, 39)
    ]
  },
  {
    id: 'dawn-waterfront-carpet',
    tone: 'waterfront',
    points: [
      point(11, 28), point(23, 17), point(39, 18), point(39, 37),
      point(29, 49), point(14, 43)
    ]
  },
  {
    id: 'dawn-east-service-carpet',
    tone: 'service',
    points: [
      point(68, 27), point(91, 29), point(103, 45), point(99, 68),
      point(82, 78), point(68, 64)
    ]
  },
  {
    id: 'dawn-civic-greenway',
    tone: 'greenway',
    points: [
      point(31, 58, -0.28), point(48, 54, -0.28), point(68, 60, -0.28),
      point(73, 75, -0.28), point(55, 84, -0.28), point(36, 75, -0.28)
    ]
  }
];

const interpolate = (from: ScenePoint, to: ScenePoint, progress: number): ScenePoint => ({
  x: from.x + (to.x - from.x) * progress,
  z: from.z + (to.z - from.z) * progress,
  elevation: from.elevation + (to.elevation - from.elevation) * progress
});

const makeStreetLights = (
  roads: readonly RoadSceneState[],
  lit: boolean
): CommercialStreetLightPlan[] => {
  const lights: CommercialStreetLightPlan[] = [];
  for (let roadIndex = 0; roadIndex < roads.length; roadIndex += 1) {
    const road = roads[roadIndex];
    if (!road) continue;
    for (let segmentIndex = 0; segmentIndex < road.points.length - 1; segmentIndex += 1) {
      const from = road.points[segmentIndex];
      const to = road.points[segmentIndex + 1];
      if (!from || !to) continue;
      for (const progress of [0.28, 0.72]) {
        const base = interpolate(from, to, progress);
        const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
        const side = ((roadIndex + segmentIndex + Math.round(progress * 10)) % 2 === 0 ? -1 : 1) as -1 | 1;
        const offset = road.laneCount === 2 ? 1.55 : 1.15;
        lights.push({
          id: `${road.id}-lamp-${segmentIndex}-${progress}`,
          point: {
            x: base.x - (to.z - from.z) / length * offset * side,
            z: base.z + (to.x - from.x) / length * offset * side,
            elevation: 0.04
          },
          lit: lit && road.powered,
          side
        });
        if (lights.length >= 30) return lights;
      }
    }
  }
  return lights;
};

const vehicleTone = (road: RoadSceneState, index: number): CommercialVehicleTone => {
  if (road.id.includes('industrial') || road.id.includes('south')) return 'freight';
  if (index % 4 === 0) return 'service';
  return 'commuter';
};

const makeVehicles = (
  roads: readonly RoadSceneState[],
  headlights: boolean,
  diagnostics: boolean
): CommercialVehiclePlan[] => {
  if (diagnostics) return [];
  const vehicles: CommercialVehiclePlan[] = [];
  roads.forEach((road, roadIndex) => {
    if (road.points.length < 2 || road.traffic < 0.08) return;
    const count = road.laneCount === 2 && road.traffic > 0.35 ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      vehicles.push({
        id: `${road.id}-vehicle-${index}`,
        path: road.points.map((candidate) => ({ ...candidate, elevation: 0.05 })),
        phase: seededUnit(roadIndex + 17, index + 31),
        speed: 0.022 + road.traffic * 0.032 + index * 0.004,
        tone: vehicleTone(road, roadIndex + index),
        headlights
      });
    }
  });
  return vehicles.slice(0, 11);
};

export const planCommercialCityLife = (
  state: Pick<
    CitySceneState,
    'levelId' | 'hour' | 'presentationMode' | 'roads' | 'districtPrefabs'
  >
): CommercialCityLifePlan => {
  if (state.levelId !== 'city-01') {
    return { fabric: [], streetLights: [], vehicles: [], recovery: [] };
  }

  const night = state.hour < 6 || state.hour >= 18;
  const diagnostics = state.presentationMode === 'grid';
  const recovery = (state.districtPrefabs ?? [])
    .filter((district) => district.status !== 'normal')
    .map((district, index): CommercialDistrictRecoveryPlan => ({
      id: `${district.id}-recovery`,
      point: { x: district.x, z: district.z, elevation: 0.18 },
      width: district.width,
      depth: district.depth,
      status: district.status,
      intensity: Math.max(0.16, 1 - district.powerRatio),
      phase: seededUnit(district.variant, index + 71)
    }));

  return {
    fabric: dawnCityFabric(),
    streetLights: makeStreetLights(state.roads, night),
    vehicles: makeVehicles(state.roads, night, diagnostics),
    recovery
  };
};
