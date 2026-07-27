export type GridNodeKind =
  | 'generation'
  | 'storage'
  | 'substation'
  | 'distribution'
  | 'district';

export interface GridNodeConfig {
  id: string;
  label: string;
  kind: GridNodeKind;
  capacity: number;
  districtId?: string;
  plotIds?: string[];
  facilityConfigIds?: string[];
  alwaysOperational?: boolean;
  demandWeight?: number;
  priority?: number;
}

export interface GridEdgeConfig {
  id: string;
  from: string;
  to: string;
  capacity: number;
  enabled?: boolean;
  controllable?: boolean;
  initialEnabled?: boolean;
  initialFaulted?: boolean;
  repairCost?: number;
  role?: 'backbone' | 'feeder' | 'tie';
}

export interface GridNetworkConfig {
  nodes: GridNodeConfig[];
  edges: GridEdgeConfig[];
}

export interface GridSourceInput {
  nodeId: string;
  available: number;
}

export interface GridDispatchInput {
  network: GridNetworkConfig;
  demand: number;
  capacityBase: number;
  sources: GridSourceInput[];
}

export interface GridDistrictDispatch {
  nodeId: string;
  districtId: string;
  priority: number;
  demand: number;
  served: number;
  supplyRatio: number;
}

export interface GridEdgeDispatch {
  edgeId: string;
  flow: number;
  capacity: number;
  loadRatio: number;
  status: 'normal' | 'overload' | 'offline';
}

export interface GridNodeDispatch {
  nodeId: string;
  flow: number;
  capacity: number;
  loadRatio: number;
  status: 'active' | 'warning' | 'offline';
}

export interface GridDispatchResult {
  servedDemand: number;
  shortage: number;
  supplyRatio: number;
  availableSupply: number;
  curtailedSupply: number;
  districts: GridDistrictDispatch[];
  edges: GridEdgeDispatch[];
  nodes: GridNodeDispatch[];
}

interface DispatchPath {
  sourceId: string;
  nodeIds: string[];
  edgeIds: string[];
}

const EPSILON = 0.000001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const addAmount = (target: Map<string, number>, key: string, amount: number): void => {
  target.set(key, (target.get(key) ?? 0) + amount);
};

export class GridGraphSystem {
  static dispatch(input: GridDispatchInput): GridDispatchResult {
    const demand = Math.max(0, input.demand);
    const capacityBase = Math.max(1, input.capacityBase);
    const nodeById = new Map(input.network.nodes.map((node) => [node.id, node]));
    const outgoing = new Map<string, GridEdgeConfig[]>();

    for (const edge of input.network.edges) {
      if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) continue;
      const edges = outgoing.get(edge.from) ?? [];
      edges.push(edge);
      outgoing.set(edge.from, edges);
    }

    const nodeCapacity = new Map<string, number>();
    const nodeRemaining = new Map<string, number>();
    for (const node of input.network.nodes) {
      const capacity = Math.max(0, node.capacity) * capacityBase;
      nodeCapacity.set(node.id, capacity);
      nodeRemaining.set(node.id, capacity);
    }

    const edgeCapacity = new Map<string, number>();
    const edgeRemaining = new Map<string, number>();
    for (const edge of input.network.edges) {
      const capacity = edge.enabled === false ? 0 : Math.max(0, edge.capacity) * capacityBase;
      edgeCapacity.set(edge.id, capacity);
      edgeRemaining.set(edge.id, capacity);
    }

    const sourceInitial = new Map<string, number>();
    const sourceRemaining = new Map<string, number>();
    for (const source of input.sources) {
      const node = nodeById.get(source.nodeId);
      if (!node || (node.kind !== 'generation' && node.kind !== 'storage')) continue;
      const amount = Math.max(0, source.available);
      addAmount(sourceInitial, source.nodeId, amount);
      addAmount(sourceRemaining, source.nodeId, amount);
    }

    const districtNodes = input.network.nodes
      .filter((node): node is GridNodeConfig & { districtId: string } =>
        node.kind === 'district' && Boolean(node.districtId)
      );
    const totalDemandWeight = districtNodes.reduce(
      (sum, node) => sum + Math.max(EPSILON, node.demandWeight ?? node.capacity),
      0
    );
    const nodeFlow = new Map<string, number>();
    const edgeFlow = new Map<string, number>();
    const districts: GridDistrictDispatch[] = [];

    const orderedDistricts = districtNodes
      .map((node, index) => ({ node, index }))
      .sort((left, right) =>
        (left.node.priority ?? left.index) - (right.node.priority ?? right.index)
        || left.index - right.index
      );

    for (const { node, index } of orderedDistricts) {
      const weight = Math.max(EPSILON, node.demandWeight ?? node.capacity);
      const districtDemand = totalDemandWeight > 0 ? demand * weight / totalDemandWeight : 0;
      let remainingDemand = districtDemand;
      let served = 0;

      while (remainingDemand > EPSILON) {
        const path = this.findPath(
          node.id,
          sourceRemaining,
          nodeRemaining,
          edgeRemaining,
          outgoing
        );
        if (!path) break;

        let transfer = Math.min(
          remainingDemand,
          sourceRemaining.get(path.sourceId) ?? 0
        );
        for (const nodeId of path.nodeIds) {
          transfer = Math.min(transfer, nodeRemaining.get(nodeId) ?? 0);
        }
        for (const edgeId of path.edgeIds) {
          transfer = Math.min(transfer, edgeRemaining.get(edgeId) ?? 0);
        }
        if (transfer <= EPSILON) break;

        sourceRemaining.set(
          path.sourceId,
          Math.max(0, (sourceRemaining.get(path.sourceId) ?? 0) - transfer)
        );
        for (const nodeId of path.nodeIds) {
          nodeRemaining.set(nodeId, Math.max(0, (nodeRemaining.get(nodeId) ?? 0) - transfer));
          addAmount(nodeFlow, nodeId, transfer);
        }
        for (const edgeId of path.edgeIds) {
          edgeRemaining.set(edgeId, Math.max(0, (edgeRemaining.get(edgeId) ?? 0) - transfer));
          addAmount(edgeFlow, edgeId, transfer);
        }

        remainingDemand -= transfer;
        served += transfer;
      }

      districts.push({
        nodeId: node.id,
        districtId: node.districtId,
        priority: node.priority ?? index,
        demand: districtDemand,
        served,
        supplyRatio: districtDemand <= EPSILON ? 1 : clamp(served / districtDemand, 0, 1)
      });
    }

    const servedDemand = districts.reduce((sum, district) => sum + district.served, 0);
    const availableSupply = [...sourceInitial.values()].reduce((sum, amount) => sum + amount, 0);
    const shortage = Math.max(0, demand - servedDemand);
    const districtByNode = new Map(districts.map((district) => [district.nodeId, district]));

    const edges = input.network.edges.map((edge): GridEdgeDispatch => {
      const capacity = edgeCapacity.get(edge.id) ?? 0;
      const flow = edgeFlow.get(edge.id) ?? 0;
      const loadRatio = capacity <= EPSILON ? 0 : flow / capacity;
      return {
        edgeId: edge.id,
        flow,
        capacity,
        loadRatio,
        status: edge.enabled === false
          ? 'offline'
          : shortage > EPSILON && loadRatio >= 0.999
            ? 'overload'
            : 'normal'
      };
    });

    const nodes = input.network.nodes.map((node): GridNodeDispatch => {
      const capacity = nodeCapacity.get(node.id) ?? 0;
      const flow = nodeFlow.get(node.id) ?? 0;
      const loadRatio = capacity <= EPSILON ? 0 : flow / capacity;
      const district = districtByNode.get(node.id);
      const source = sourceInitial.get(node.id) ?? 0;
      let status: GridNodeDispatch['status'];

      if (district) {
        status = district.supplyRatio < 0.16
          ? 'offline'
          : district.supplyRatio < 0.98
            ? 'warning'
            : 'active';
      } else if (node.kind === 'generation' || node.kind === 'storage') {
        status = source <= EPSILON ? 'offline' : loadRatio >= 0.999 ? 'warning' : 'active';
      } else {
        status = flow <= EPSILON
          ? 'offline'
          : shortage > EPSILON && loadRatio >= 0.999
            ? 'warning'
            : 'active';
      }

      return { nodeId: node.id, flow, capacity, loadRatio, status };
    });

    return {
      servedDemand,
      shortage,
      supplyRatio: demand <= EPSILON ? 1 : clamp(servedDemand / demand, 0, 1),
      availableSupply,
      curtailedSupply: Math.max(0, availableSupply - servedDemand),
      districts,
      edges,
      nodes
    };
  }

  private static findPath(
    targetId: string,
    sourceRemaining: ReadonlyMap<string, number>,
    nodeRemaining: ReadonlyMap<string, number>,
    edgeRemaining: ReadonlyMap<string, number>,
    outgoing: ReadonlyMap<string, readonly GridEdgeConfig[]>
  ): DispatchPath | undefined {
    const queue: string[] = [];
    const visited = new Set<string>();
    const sourceForNode = new Map<string, string>();
    const previous = new Map<string, { nodeId: string; edgeId: string }>();

    for (const [sourceId, available] of sourceRemaining) {
      if (available <= EPSILON || (nodeRemaining.get(sourceId) ?? 0) <= EPSILON) continue;
      queue.push(sourceId);
      visited.add(sourceId);
      sourceForNode.set(sourceId, sourceId);
    }

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (!current) continue;
      if (current === targetId) break;

      for (const edge of outgoing.get(current) ?? []) {
        if ((edgeRemaining.get(edge.id) ?? 0) <= EPSILON) continue;
        if ((nodeRemaining.get(edge.to) ?? 0) <= EPSILON) continue;
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        previous.set(edge.to, { nodeId: current, edgeId: edge.id });
        const sourceId = sourceForNode.get(current);
        if (sourceId) sourceForNode.set(edge.to, sourceId);
        queue.push(edge.to);
      }
    }

    if (!visited.has(targetId)) return undefined;
    const sourceId = sourceForNode.get(targetId);
    if (!sourceId) return undefined;

    const nodeIds = [targetId];
    const edgeIds: string[] = [];
    let cursor = targetId;
    while (cursor !== sourceId) {
      const step = previous.get(cursor);
      if (!step) return undefined;
      edgeIds.unshift(step.edgeId);
      cursor = step.nodeId;
      nodeIds.unshift(cursor);
    }

    return { sourceId, nodeIds, edgeIds };
  }
}
