import type {
  CitySceneState,
  RoadSceneState,
  ScenePoint
} from '../CitySceneTypes';

const pointDistanceSquared = (left: ScenePoint, right: ScenePoint): number => {
  const dx = left.x - right.x;
  const dz = left.z - right.z;
  return dx * dx + dz * dz;
};

export const buildCity01AccessRoads = (state: CitySceneState): RoadSceneState[] => {
  const backbonePoints = state.roads.flatMap((road) => road.points);
  if (backbonePoints.length === 0) return [];

  const nearestBackbonePoint = (target: ScenePoint): ScenePoint => {
    let nearest = backbonePoints[0]!;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const point of backbonePoints) {
      const distance = pointDistanceSquared(point, target);
      if (distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    }
    return nearest;
  };

  const districtRoads = (state.districtPrefabs ?? []).map((district): RoadSceneState => ({
    id: `district-access-${district.id}`,
    points: [
      nearestBackbonePoint(district),
      { x: district.x, z: district.z, elevation: 0.02 }
    ],
    laneCount: district.kind === 'industrial' || district.kind === 'commercial' ? 2 : 1,
    traffic: state.trafficDensity,
    powered: district.powerRatio > 0.05
  }));

  const facilityRoads = state.facilities.map((facility): RoadSceneState => ({
    id: `facility-access-${facility.instanceId}`,
    points: [
      nearestBackbonePoint(facility),
      { x: facility.x, z: facility.z, elevation: 0.02 }
    ],
    laneCount: 1,
    traffic: state.trafficDensity * 0.45,
    powered: facility.enabled
  }));

  return [...districtRoads, ...facilityRoads];
};
