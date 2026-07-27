import type {
  CitySceneState,
  RoadSceneState,
  ScenePoint
} from '../CitySceneTypes';

interface SegmentProjection {
  point: ScenePoint;
  distanceSquared: number;
}

const pointDistanceSquared = (left: ScenePoint, right: ScenePoint): number => {
  const dx = left.x - right.x;
  const dz = left.z - right.z;
  return dx * dx + dz * dz;
};

const projectToSegment = (
  target: ScenePoint,
  start: ScenePoint,
  end: ScenePoint
): SegmentProjection => {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 0.0001) {
    return { point: start, distanceSquared: pointDistanceSquared(target, start) };
  }
  const t = Math.min(1, Math.max(0,
    ((target.x - start.x) * dx + (target.z - start.z) * dz) / lengthSquared
  ));
  const point: ScenePoint = {
    x: start.x + dx * t,
    z: start.z + dz * t,
    elevation: 0.02
  };
  return { point, distanceSquared: pointDistanceSquared(target, point) };
};

const nearestBackboneProjection = (
  roads: readonly RoadSceneState[],
  target: ScenePoint
): SegmentProjection | undefined => {
  let nearest: SegmentProjection | undefined;
  for (const road of roads) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];
      if (!start || !end) continue;
      const projection = projectToSegment(target, start, end);
      if (!nearest || projection.distanceSquared < nearest.distanceSquared) nearest = projection;
    }
  }
  return nearest;
};

export const buildCity01AccessRoads = (state: CitySceneState): RoadSceneState[] => {
  if (state.roads.every((road) => road.points.length < 2)) return [];

  const accessRoads: RoadSceneState[] = [];
  for (const district of state.districtPrefabs ?? []) {
    const projection = nearestBackboneProjection(state.roads, district);
    if (!projection || projection.distanceSquared > 13 * 13) continue;
    accessRoads.push({
      id: `district-access-${district.id}`,
      points: [projection.point, { x: district.x, z: district.z, elevation: 0.02 }],
      laneCount: 1,
      traffic: state.trafficDensity * 0.5,
      powered: district.powerRatio > 0.05
    });
  }

  for (const facility of state.facilities) {
    const projection = nearestBackboneProjection(state.roads, facility);
    if (!projection || projection.distanceSquared > 6 * 6) continue;
    accessRoads.push({
      id: `facility-access-${facility.instanceId}`,
      points: [projection.point, { x: facility.x, z: facility.z, elevation: 0.02 }],
      laneCount: 1,
      traffic: state.trafficDensity * 0.2,
      powered: facility.enabled
    });
  }

  return accessRoads;
};
