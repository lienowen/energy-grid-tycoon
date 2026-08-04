import type {
  EdgeRuntimeState,
  PowerEdgeConfig,
  PowerNodeConfig,
  PowerNodeId
} from './types';

interface AdjacencyEntry {
  nodeId: PowerNodeId;
  cost: number;
}

export interface PathfindingOptions {
  blockedNodeIds?: ReadonlySet<PowerNodeId>;
}

const edgeLength = (
  edge: PowerEdgeConfig,
  nodesById: ReadonlyMap<PowerNodeId, PowerNodeConfig>
): number => {
  if (edge.length && edge.length > 0) return edge.length;
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  if (!from || !to) return 1;
  return Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
};

export const findShortestPath = (
  nodes: readonly PowerNodeConfig[],
  edges: readonly PowerEdgeConfig[],
  edgeRuntimeById: ReadonlyMap<string, EdgeRuntimeState>,
  startNodeId: PowerNodeId,
  targetNodeId: PowerNodeId,
  options: PathfindingOptions = {}
): PowerNodeId[] => {
  if (startNodeId === targetNodeId) return [startNodeId];

  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));
  if (!nodesById.has(startNodeId) || !nodesById.has(targetNodeId)) return [];

  const blocked = options.blockedNodeIds ?? new Set<PowerNodeId>();
  const adjacency = new Map<PowerNodeId, AdjacencyEntry[]>();

  for (const edge of edges) {
    const runtime = edgeRuntimeById.get(edge.id);
    if (!runtime || runtime.operatingState !== 'online') continue;
    const cost = edgeLength(edge, nodesById);
    const fromEntries = adjacency.get(edge.from) ?? [];
    fromEntries.push({ nodeId: edge.to, cost });
    adjacency.set(edge.from, fromEntries);
    const toEntries = adjacency.get(edge.to) ?? [];
    toEntries.push({ nodeId: edge.from, cost });
    adjacency.set(edge.to, toEntries);
  }

  const distance = new Map<PowerNodeId, number>();
  const previous = new Map<PowerNodeId, PowerNodeId>();
  const unvisited = new Set(nodes.map((node) => node.id));
  for (const node of nodes) distance.set(node.id, Number.POSITIVE_INFINITY);
  distance.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let current: PowerNodeId | undefined;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const candidate of unvisited) {
      const candidateDistance = distance.get(candidate) ?? Number.POSITIVE_INFINITY;
      if (candidateDistance < currentDistance) {
        current = candidate;
        currentDistance = candidateDistance;
      }
    }

    if (!current || !Number.isFinite(currentDistance)) break;
    unvisited.delete(current);
    if (current === targetNodeId) break;

    for (const entry of adjacency.get(current) ?? []) {
      if (!unvisited.has(entry.nodeId)) continue;
      if (
        blocked.has(entry.nodeId)
        && entry.nodeId !== targetNodeId
        && entry.nodeId !== startNodeId
      ) continue;
      const nextDistance = currentDistance + entry.cost;
      if (nextDistance >= (distance.get(entry.nodeId) ?? Number.POSITIVE_INFINITY)) continue;
      distance.set(entry.nodeId, nextDistance);
      previous.set(entry.nodeId, current);
    }
  }

  if (!previous.has(targetNodeId)) return [];
  const path: PowerNodeId[] = [targetNodeId];
  let cursor = targetNodeId;
  while (cursor !== startNodeId) {
    const prior = previous.get(cursor);
    if (!prior) return [];
    path.push(prior);
    cursor = prior;
  }
  return path.reverse();
};

export const edgeBetween = (
  edges: readonly PowerEdgeConfig[],
  from: PowerNodeId,
  to: PowerNodeId
): PowerEdgeConfig | undefined => edges.find((edge) => (
  (edge.from === from && edge.to === to)
  || (edge.from === to && edge.to === from)
));
