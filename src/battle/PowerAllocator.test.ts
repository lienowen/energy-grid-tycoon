import { describe, expect, it } from 'vitest';
import { allocatePower } from './PowerAllocator';
import type {
  EdgeRuntimeState,
  NodeRuntimeState,
  PowerEdgeConfig,
  PowerNodeConfig
} from './types';

const runtimeForNodes = (nodes: readonly PowerNodeConfig[]): Map<string, NodeRuntimeState> => new Map(
  nodes.map((node) => [node.id, {
    id: node.id,
    operatingState: 'online' as const,
    requestedMw: node.demandMw ?? 0,
    allocatedMw: 0,
    powerPercent: 0,
    outageSeconds: 0,
    batteryEnergyMwh: node.batteryInitialMwh ?? 0
  }])
);

const runtimeForEdges = (edges: readonly PowerEdgeConfig[]): Map<string, EdgeRuntimeState> => new Map(
  edges.map((edge) => [edge.id, {
    id: edge.id,
    operatingState: 'online' as const,
    loadMw: 0,
    loadPercent: 0,
    loadState: 'normal' as const,
    overloadRemainingSeconds: 0,
    overloadCooldownRemainingSeconds: 0,
    heatPercent: 0,
    repairRemainingSeconds: 0
  }])
);

describe('PowerAllocator topology', () => {
  it('removes power immediately when the only route is disconnected', () => {
    const nodes: PowerNodeConfig[] = [
      { id: 'plant', label: 'Plant', kind: 'generator', x: 0, y: 0, supplyMw: 100 },
      { id: 'junction', label: 'Junction', kind: 'junction', x: 1, y: 0 },
      { id: 'hospital', label: 'Hospital', kind: 'hospital', x: 2, y: 0, demandMw: 50, priority: 100 }
    ];
    const edges: PowerEdgeConfig[] = [
      { id: 'plant-junction', from: 'plant', to: 'junction', capacityMw: 100 },
      { id: 'junction-hospital', from: 'junction', to: 'hospital', capacityMw: 100 }
    ];
    const nodeRuntime = runtimeForNodes(nodes);
    const edgeRuntime = runtimeForEdges(edges);

    const connected = allocatePower({
      nodes,
      edges,
      runtimeByNodeId: nodeRuntime,
      edgeRuntimeById: edgeRuntime,
      deltaSeconds: 1
    });
    expect(connected.allocationByNodeId.get('hospital')).toBe(50);
    expect(connected.flowByEdgeId.get('plant-junction')).toBe(50);
    expect(connected.flowByEdgeId.get('junction-hospital')).toBe(50);

    edgeRuntime.get('junction-hospital')!.operatingState = 'offline';
    const disconnected = allocatePower({
      nodes,
      edges,
      runtimeByNodeId: nodeRuntime,
      edgeRuntimeById: edgeRuntime,
      deltaSeconds: 1
    });
    expect(disconnected.allocationByNodeId.get('hospital')).toBe(0);
    expect(disconnected.flowByEdgeId.get('plant-junction')).toBe(0);
    expect(disconnected.flowByEdgeId.get('junction-hospital')).toBe(0);
  });

  it('uses line capacity and priority instead of globally allocating through a bottleneck', () => {
    const nodes: PowerNodeConfig[] = [
      { id: 'plant', label: 'Plant', kind: 'generator', x: 0, y: 0, supplyMw: 120 },
      { id: 'hub', label: 'Hub', kind: 'junction', x: 1, y: 0 },
      { id: 'hospital', label: 'Hospital', kind: 'hospital', x: 2, y: -1, demandMw: 50, priority: 100 },
      { id: 'mall', label: 'Mall', kind: 'commercial', x: 2, y: 1, demandMw: 50, priority: 10 }
    ];
    const edges: PowerEdgeConfig[] = [
      { id: 'plant-hub', from: 'plant', to: 'hub', capacityMw: 60 },
      { id: 'hub-hospital', from: 'hub', to: 'hospital', capacityMw: 60 },
      { id: 'hub-mall', from: 'hub', to: 'mall', capacityMw: 60 }
    ];

    const result = allocatePower({
      nodes,
      edges,
      runtimeByNodeId: runtimeForNodes(nodes),
      edgeRuntimeById: runtimeForEdges(edges),
      deltaSeconds: 1
    });

    expect(result.allocationByNodeId.get('hospital')).toBe(50);
    expect(result.allocationByNodeId.get('mall')).toBe(10);
    expect(result.flowByEdgeId.get('plant-hub')).toBe(60);
    expect(result.totalAllocatedMw).toBe(60);
  });

  it('lets a connected battery support an island without pretending the generator crosses an open line', () => {
    const nodes: PowerNodeConfig[] = [
      { id: 'plant', label: 'Plant', kind: 'generator', x: 0, y: 0, supplyMw: 100 },
      { id: 'battery', label: 'Battery', kind: 'battery', x: 2, y: 0, batteryCapacityMwh: 20, batteryInitialMwh: 10, batteryMaxDischargeMw: 40 },
      { id: 'hospital', label: 'Hospital', kind: 'hospital', x: 3, y: 0, demandMw: 30, priority: 100 }
    ];
    const edges: PowerEdgeConfig[] = [
      { id: 'plant-battery', from: 'plant', to: 'battery', capacityMw: 100 },
      { id: 'battery-hospital', from: 'battery', to: 'hospital', capacityMw: 40 }
    ];
    const edgeRuntime = runtimeForEdges(edges);
    edgeRuntime.get('plant-battery')!.operatingState = 'offline';

    const result = allocatePower({
      nodes,
      edges,
      runtimeByNodeId: runtimeForNodes(nodes),
      edgeRuntimeById: edgeRuntime,
      deltaSeconds: 1
    });

    expect(result.allocationByNodeId.get('hospital')).toBe(30);
    expect(result.batteryDischargeMw).toBe(30);
    expect(result.flowByEdgeId.get('plant-battery')).toBe(0);
    expect(result.flowByEdgeId.get('battery-hospital')).toBe(30);
  });
});
