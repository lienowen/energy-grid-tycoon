import type {
  CitySceneState,
  RoadSceneState,
  ScenePoint
} from '../CitySceneTypes';

/**
 * Diagnostic-only topology for City-01.
 *
 * City mode uses the authored `city01_road_network_base` asset and must never
 * create roads from this module. These nodes, edges and access-line helpers are
 * reserved for grid diagnostics, validation and editor tooling.
 */
export const CITY01_ROAD_TOPOLOGY_MODE = 'diagnostic-only' as const;

export type City01RoadClass = 'arterial' | 'collector' | 'access';
export type City01RoadExit = 'NW' | 'NE' | 'SE' | 'SW';
export type City01RoadNodeKind = 'junction' | 'district-entry' | 'facility-access';

export interface City01RoadNode {
  id: string;
  position: { x: number; y: number };
  kind: City01RoadNodeKind;
  districtId?: string;
  facilityZoneId?: string;
}

export interface City01RoadEdge {
  id: string;
  from: string;
  to: string;
  roadClass: City01RoadClass;
  exits: readonly [City01RoadExit, City01RoadExit];
  assetId: string;
  isDeadEnd: boolean;
  maxAccessLength: number;
}

export const city01RoadNodes: readonly City01RoadNode[] = [
  { id: 'road.west.bridge', position: { x: 27, y: 50 }, kind: 'junction' },
  { id: 'road.central.cross', position: { x: 55, y: 40 }, kind: 'junction' },
  { id: 'road.east.corner', position: { x: 75, y: 40 }, kind: 'junction' },
  { id: 'road.west.south', position: { x: 35, y: 60 }, kind: 'junction' },
  { id: 'road.central.t', position: { x: 55, y: 60 }, kind: 'junction' },
  { id: 'road.east.south', position: { x: 75, y: 60 }, kind: 'junction' },
  { id: 'entry.commercial', position: { x: 34, y: 35 }, kind: 'district-entry', districtId: 'dawn-commercial' },
  { id: 'entry.residential', position: { x: 77, y: 28 }, kind: 'district-entry', districtId: 'dawn-residential' },
  { id: 'entry.public', position: { x: 55, y: 54 }, kind: 'district-entry', districtId: 'dawn-public' },
  { id: 'entry.old-town', position: { x: 31, y: 70 }, kind: 'district-entry', districtId: 'dawn-old-town' },
  { id: 'entry.industrial', position: { x: 76, y: 72 }, kind: 'district-entry', districtId: 'dawn-industrial' }
];

export const city01RoadEdges: readonly City01RoadEdge[] = [
  {
    id: 'road.west-to-central', from: 'road.west.bridge', to: 'road.central.cross',
    roadClass: 'arterial', exits: ['SE', 'NW'], assetId: 'terrain_road_bridge_base',
    isDeadEnd: false, maxAccessLength: 32
  },
  {
    id: 'road.central-to-east', from: 'road.central.cross', to: 'road.east.corner',
    roadClass: 'arterial', exits: ['SE', 'NW'], assetId: 'terrain_road_crossroad_base',
    isDeadEnd: false, maxAccessLength: 22
  },
  {
    id: 'road.west-vertical', from: 'road.west.bridge', to: 'road.west.south',
    roadClass: 'collector', exits: ['SW', 'NE'], assetId: 'terrain_road_straight_base',
    isDeadEnd: false, maxAccessLength: 20
  },
  {
    id: 'road.central-vertical', from: 'road.central.cross', to: 'road.central.t',
    roadClass: 'collector', exits: ['SW', 'NE'], assetId: 'terrain_road_t_junction_base',
    isDeadEnd: false, maxAccessLength: 22
  },
  {
    id: 'road.east-vertical', from: 'road.east.corner', to: 'road.east.south',
    roadClass: 'collector', exits: ['SW', 'NE'], assetId: 'terrain_road_corner_base',
    isDeadEnd: false, maxAccessLength: 22
  },
  {
    id: 'road.south-west-to-central', from: 'road.west.south', to: 'road.central.t',
    roadClass: 'arterial', exits: ['SE', 'NW'], assetId: 'terrain_road_straight_base',
    isDeadEnd: false, maxAccessLength: 22
  },
  {
    id: 'road.south-central-to-east', from: 'road.central.t', to: 'road.east.south',
    roadClass: 'arterial', exits: ['SE', 'NW'], assetId: 'terrain_road_straight_base',
    isDeadEnd: false, maxAccessLength: 22
  },
  {
    id: 'access.commercial', from: 'road.west.bridge', to: 'entry.commercial',
    roadClass: 'access', exits: ['NE', 'SW'], assetId: 'pending-road-access-commercial',
    isDeadEnd: false, maxAccessLength: 20
  },
  {
    id: 'access.residential', from: 'road.east.corner', to: 'entry.residential',
    roadClass: 'access', exits: ['NE', 'SW'], assetId: 'pending-road-access-residential',
    isDeadEnd: false, maxAccessLength: 20
  },
  {
    id: 'access.public', from: 'road.central.t', to: 'entry.public',
    roadClass: 'access', exits: ['NE', 'SW'], assetId: 'pending-road-access-public',
    isDeadEnd: false, maxAccessLength: 20
  },
  {
    id: 'access.old-town', from: 'road.west.south', to: 'entry.old-town',
    roadClass: 'access', exits: ['SW', 'NE'], assetId: 'pending-road-access-old-town',
    isDeadEnd: false, maxAccessLength: 20
  },
  {
    id: 'access.industrial', from: 'road.east.south', to: 'entry.industrial',
    roadClass: 'access', exits: ['SE', 'NW'], assetId: 'pending-road-access-industrial',
    isDeadEnd: false, maxAccessLength: 20
  }
];

const mapDistance = (left: City01RoadNode, right: City01RoadNode): number =>
  Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y);

export const validateCity01RoadTopology = (): string[] => {
  const errors: string[] = [];
  const nodes = new Map<string, City01RoadNode>();
  const edgeIds = new Set<string>();

  for (const node of city01RoadNodes) {
    if (nodes.has(node.id)) errors.push(`duplicate road node: ${node.id}`);
    nodes.set(node.id, node);
    if (node.position.x < 0 || node.position.x > 100 || node.position.y < 0 || node.position.y > 100) {
      errors.push(`road node outside map bounds: ${node.id}`);
    }
  }

  const adjacency = new Map<string, Set<string>>();
  const connect = (left: string, right: string): void => {
    const targets = adjacency.get(left) ?? new Set<string>();
    targets.add(right);
    adjacency.set(left, targets);
  };

  for (const edge of city01RoadEdges) {
    if (edgeIds.has(edge.id)) errors.push(`duplicate road edge: ${edge.id}`);
    edgeIds.add(edge.id);
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) {
      errors.push(`road edge references missing node: ${edge.id}`);
      continue;
    }
    const length = mapDistance(from, to);
    if (length > edge.maxAccessLength + 0.001) errors.push(`road edge exceeds maximum length: ${edge.id}`);
    if (edge.roadClass === 'access' && length > 20.001) errors.push(`access road exceeds one tile: ${edge.id}`);
    if (edge.exits[0] === edge.exits[1]) errors.push(`road exits cannot be identical: ${edge.id}`);
    connect(edge.from, edge.to);
    connect(edge.to, edge.from);
  }

  const visited = new Set<string>();
  const queue = ['road.central.cross'];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) queue.push(next);
  }

  for (const node of city01RoadNodes) {
    if (node.kind === 'district-entry' && !visited.has(node.id)) {
      errors.push(`district entry is unreachable: ${node.id}`);
    }
  }
  return errors;
};

interface SegmentProjection {
  point: ScenePoint;
  distanceSquared: number;
}

const pointDistanceSquared = (left: ScenePoint, right: ScenePoint): number => {
  const dx = left.x - right.x;
  const dz = left.z - right.z;
  return dx * dx + dz * dz;
};

const projectToSegment = (target: ScenePoint, start: ScenePoint, end: ScenePoint): SegmentProjection => {
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

/**
 * Builds temporary diagnostic access lines from scene-state roads. The normal
 * City-01 renderer never calls this helper because city mode uses authored road
 * art and does not create road structure at render time.
 */
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
