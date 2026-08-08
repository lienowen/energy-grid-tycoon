import type {
  EdgeRuntimeState,
  NodeRuntimeState,
  PowerEdgeConfig,
  PowerEdgeId,
  PowerNodeConfig,
  PowerNodeId
} from './types';

export interface PowerAllocationResult {
  totalSupplyMw: number;
  totalDemandMw: number;
  totalAllocatedMw: number;
  batteryDischargeMw: number;
  batteryChargeMw: number;
  batteryEnergyMwh: number;
  allocationByNodeId: Map<PowerNodeId, number>;
  flowByEdgeId: Map<PowerEdgeId, number>;
}

export interface PowerAllocationInput {
  nodes: readonly PowerNodeConfig[];
  edges: readonly PowerEdgeConfig[];
  runtimeByNodeId: ReadonlyMap<PowerNodeId, NodeRuntimeState>;
  edgeRuntimeById: ReadonlyMap<PowerEdgeId, EdgeRuntimeState>;
  deltaSeconds: number;
  monsterDrainByNodeId?: ReadonlyMap<PowerNodeId, number>;
}

interface SourceState {
  nodeId: PowerNodeId;
  type: 'generator' | 'battery';
  availableMw: number;
}

interface PathResult {
  edgeIds: PowerEdgeId[];
  cost: number;
}

interface AdjacencyEntry {
  nodeId: PowerNodeId;
  edgeId: PowerEdgeId;
  cost: number;
}

const EPSILON = 0.0001;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const edgeCost = (
  edge: PowerEdgeConfig,
  nodesById: ReadonlyMap<PowerNodeId, PowerNodeConfig>
): number => {
  if (edge.length && edge.length > 0) return edge.length;
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  if (!from || !to) return 1;
  return Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
};

const buildAdjacency = (
  nodes: readonly PowerNodeConfig[],
  edges: readonly PowerEdgeConfig[],
  runtimeByNodeId: ReadonlyMap<PowerNodeId, NodeRuntimeState>,
  edgeRuntimeById: ReadonlyMap<PowerEdgeId, EdgeRuntimeState>
): Map<PowerNodeId, AdjacencyEntry[]> => {
  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));
  const adjacency = new Map<PowerNodeId, AdjacencyEntry[]>();

  for (const edge of edges) {
    const runtime = edgeRuntimeById.get(edge.id);
    if (!runtime || runtime.operatingState !== 'online') continue;
    if (runtimeByNodeId.get(edge.from)?.operatingState !== 'online') continue;
    if (runtimeByNodeId.get(edge.to)?.operatingState !== 'online') continue;

    const cost = edgeCost(edge, nodesById);
    const fromEntries = adjacency.get(edge.from) ?? [];
    fromEntries.push({ nodeId: edge.to, edgeId: edge.id, cost });
    adjacency.set(edge.from, fromEntries);

    const toEntries = adjacency.get(edge.to) ?? [];
    toEntries.push({ nodeId: edge.from, edgeId: edge.id, cost });
    adjacency.set(edge.to, toEntries);
  }

  return adjacency;
};

const shortestResidualPath = (
  adjacency: ReadonlyMap<PowerNodeId, readonly AdjacencyEntry[]>,
  residualByEdgeId: ReadonlyMap<PowerEdgeId, number>,
  startNodeId: PowerNodeId,
  targetNodeId: PowerNodeId
): PathResult | undefined => {
  if (startNodeId === targetNodeId) return { edgeIds: [], cost: 0 };

  const distance = new Map<PowerNodeId, number>([[startNodeId, 0]]);
  const previous = new Map<PowerNodeId, { nodeId: PowerNodeId; edgeId: PowerEdgeId }>();
  const unvisited = new Set<PowerNodeId>([startNodeId, targetNodeId]);
  for (const [nodeId, entries] of adjacency) {
    unvisited.add(nodeId);
    for (const entry of entries) unvisited.add(entry.nodeId);
  }

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
      if ((residualByEdgeId.get(entry.edgeId) ?? 0) <= EPSILON) continue;
      const nextDistance = currentDistance + entry.cost;
      if (nextDistance >= (distance.get(entry.nodeId) ?? Number.POSITIVE_INFINITY)) continue;
      distance.set(entry.nodeId, nextDistance);
      previous.set(entry.nodeId, { nodeId: current, edgeId: entry.edgeId });
    }
  }

  if (!previous.has(targetNodeId)) return undefined;
  const edgeIds: PowerEdgeId[] = [];
  let cursor = targetNodeId;
  while (cursor !== startNodeId) {
    const prior = previous.get(cursor);
    if (!prior) return undefined;
    edgeIds.push(prior.edgeId);
    cursor = prior.nodeId;
  }
  edgeIds.reverse();
  return { edgeIds, cost: distance.get(targetNodeId) ?? Number.POSITIVE_INFINITY };
};

const pathCapacity = (
  path: PathResult,
  residualByEdgeId: ReadonlyMap<PowerEdgeId, number>
): number => path.edgeIds.length === 0
  ? Number.POSITIVE_INFINITY
  : Math.min(...path.edgeIds.map((edgeId) => residualByEdgeId.get(edgeId) ?? 0));

const addFlow = (
  path: PathResult,
  amountMw: number,
  flowByEdgeId: Map<PowerEdgeId, number>,
  residualByEdgeId: Map<PowerEdgeId, number>
): void => {
  for (const edgeId of path.edgeIds) {
    flowByEdgeId.set(edgeId, (flowByEdgeId.get(edgeId) ?? 0) + amountMw);
    residualByEdgeId.set(edgeId, Math.max(0, (residualByEdgeId.get(edgeId) ?? 0) - amountMw));
  }
};

export const allocatePower = ({
  nodes,
  edges,
  runtimeByNodeId,
  edgeRuntimeById,
  deltaSeconds,
  monsterDrainByNodeId = new Map()
}: PowerAllocationInput): PowerAllocationResult => {
  const onlineNodes = nodes.filter((node) => runtimeByNodeId.get(node.id)?.operatingState === 'online');
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
  const adjacency = buildAdjacency(nodes, edges, runtimeByNodeId, edgeRuntimeById);
  const residualByEdgeId = new Map<PowerEdgeId, number>();
  const flowByEdgeId = new Map<PowerEdgeId, number>();

  for (const edge of edges) {
    const runtime = edgeRuntimeById.get(edge.id);
    const active = runtime?.operatingState === 'online'
      && runtimeByNodeId.get(edge.from)?.operatingState === 'online'
      && runtimeByNodeId.get(edge.to)?.operatingState === 'online';
    residualByEdgeId.set(edge.id, active ? edge.capacityMw : 0);
    flowByEdgeId.set(edge.id, 0);
  }

  const hours = Math.max(0, deltaSeconds) / 3600;
  const generators = onlineNodes.filter((node) => (node.supplyMw ?? 0) > 0);
  const batteries = onlineNodes.filter((node) => (node.batteryCapacityMwh ?? 0) > 0);
  const consumers = onlineNodes
    .map((node) => ({
      node,
      demandMw: (node.demandMw ?? 0) + (monsterDrainByNodeId.get(node.id) ?? 0)
    }))
    .filter(({ demandMw }) => demandMw > EPSILON)
    .sort((a, b) => (b.node.priority ?? 0) - (a.node.priority ?? 0));

  const baseSupplyMw = generators.reduce((sum, node) => sum + (node.supplyMw ?? 0), 0);
  const totalDemandMw = consumers.reduce((sum, consumer) => sum + consumer.demandMw, 0);

  let batteryEnergyMwh = batteries.reduce((sum, node) => (
    sum + (runtimeByNodeId.get(node.id)?.batteryEnergyMwh ?? node.batteryInitialMwh ?? 0)
  ), 0);
  const batteryCapacityMwh = batteries.reduce((sum, node) => sum + (node.batteryCapacityMwh ?? 0), 0);

  const generatorSources: SourceState[] = generators.map((node) => ({
    nodeId: node.id,
    type: 'generator',
    availableMw: node.supplyMw ?? 0
  }));
  const batterySources: SourceState[] = batteries.map((node) => {
    const energy = runtimeByNodeId.get(node.id)?.batteryEnergyMwh ?? node.batteryInitialMwh ?? 0;
    const maxDischargeMw = node.batteryMaxDischargeMw ?? 0;
    const energyLimitedMw = hours > 0 ? energy / hours : (energy > EPSILON ? maxDischargeMw : 0);
    return {
      nodeId: node.id,
      type: 'battery',
      availableMw: Math.min(maxDischargeMw, energyLimitedMw)
    };
  });

  const allocationByNodeId = new Map<PowerNodeId, number>();
  const batteryDischargeByNodeId = new Map<PowerNodeId, number>();

  const allocateFromSources = (
    targetNodeId: PowerNodeId,
    requestedMw: number,
    sources: SourceState[]
  ): number => {
    let remainingMw = requestedMw;

    while (remainingMw > EPSILON) {
      let bestSource: SourceState | undefined;
      let bestPath: PathResult | undefined;

      for (const source of sources) {
        if (source.availableMw <= EPSILON) continue;
        const path = shortestResidualPath(adjacency, residualByEdgeId, source.nodeId, targetNodeId);
        if (!path) continue;
        if (pathCapacity(path, residualByEdgeId) <= EPSILON) continue;
        if (!bestPath || path.cost < bestPath.cost) {
          bestSource = source;
          bestPath = path;
        }
      }

      if (!bestSource || !bestPath) break;
      const amountMw = Math.min(
        remainingMw,
        bestSource.availableMw,
        pathCapacity(bestPath, residualByEdgeId)
      );
      if (amountMw <= EPSILON) break;

      addFlow(bestPath, amountMw, flowByEdgeId, residualByEdgeId);
      bestSource.availableMw -= amountMw;
      remainingMw -= amountMw;
      if (bestSource.type === 'battery') {
        batteryDischargeByNodeId.set(
          bestSource.nodeId,
          (batteryDischargeByNodeId.get(bestSource.nodeId) ?? 0) + amountMw
        );
      }
    }

    return requestedMw - remainingMw;
  };

  for (const consumer of consumers) {
    const fromGeneration = allocateFromSources(consumer.node.id, consumer.demandMw, generatorSources);
    const remaining = Math.max(0, consumer.demandMw - fromGeneration);
    const fromBattery = remaining > EPSILON
      ? allocateFromSources(consumer.node.id, remaining, batterySources)
      : 0;
    allocationByNodeId.set(consumer.node.id, fromGeneration + fromBattery);
  }

  const batteryDischargeMw = [...batteryDischargeByNodeId.values()].reduce((sum, value) => sum + value, 0);
  let batteryChargeMw = 0;

  for (const battery of batteries) {
    if ((batteryDischargeByNodeId.get(battery.id) ?? 0) > EPSILON) continue;
    const runtime = runtimeByNodeId.get(battery.id);
    const energy = runtime?.batteryEnergyMwh ?? battery.batteryInitialMwh ?? 0;
    const capacity = battery.batteryCapacityMwh ?? 0;
    const maxChargeMw = battery.batteryMaxChargeMw ?? 0;
    const roomLimitedMw = hours > 0
      ? Math.max(0, capacity - energy) / hours
      : (energy < capacity - EPSILON ? maxChargeMw : 0);
    let requestedChargeMw = Math.min(maxChargeMw, roomLimitedMw);

    while (requestedChargeMw > EPSILON) {
      let bestSource: SourceState | undefined;
      let bestPath: PathResult | undefined;
      for (const source of generatorSources) {
        if (source.availableMw <= EPSILON) continue;
        const path = shortestResidualPath(adjacency, residualByEdgeId, source.nodeId, battery.id);
        if (!path) continue;
        if (pathCapacity(path, residualByEdgeId) <= EPSILON) continue;
        if (!bestPath || path.cost < bestPath.cost) {
          bestSource = source;
          bestPath = path;
        }
      }
      if (!bestSource || !bestPath) break;
      const amountMw = Math.min(requestedChargeMw, bestSource.availableMw, pathCapacity(bestPath, residualByEdgeId));
      if (amountMw <= EPSILON) break;
      addFlow(bestPath, amountMw, flowByEdgeId, residualByEdgeId);
      bestSource.availableMw -= amountMw;
      requestedChargeMw -= amountMw;
      batteryChargeMw += amountMw;
    }
  }

  const totalAllocatedMw = [...allocationByNodeId.values()].reduce((sum, value) => sum + value, 0);
  if (hours > 0) {
    batteryEnergyMwh += (batteryChargeMw - batteryDischargeMw) * hours;
    batteryEnergyMwh = clamp(batteryEnergyMwh, 0, batteryCapacityMwh);
  }

  // Keep entries stable for every configured node even when it receives no power.
  for (const node of nodes) {
    if (!allocationByNodeId.has(node.id)) allocationByNodeId.set(node.id, 0);
    if (!nodeById.has(node.id)) nodeById.set(node.id, node);
  }

  return {
    totalSupplyMw: baseSupplyMw + batteryDischargeMw,
    totalDemandMw,
    totalAllocatedMw,
    batteryDischargeMw,
    batteryChargeMw,
    batteryEnergyMwh,
    allocationByNodeId,
    flowByEdgeId
  };
};
