import type { NodeRuntimeState, PowerNodeConfig, PowerNodeId } from './types';

export interface PowerAllocationResult {
  totalSupplyMw: number;
  totalDemandMw: number;
  totalAllocatedMw: number;
  batteryDischargeMw: number;
  batteryChargeMw: number;
  batteryEnergyMwh: number;
  allocationByNodeId: Map<PowerNodeId, number>;
}

export interface PowerAllocationInput {
  nodes: readonly PowerNodeConfig[];
  runtimeByNodeId: ReadonlyMap<PowerNodeId, NodeRuntimeState>;
  deltaSeconds: number;
  monsterDrainByNodeId?: ReadonlyMap<PowerNodeId, number>;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const allocatePower = ({
  nodes,
  runtimeByNodeId,
  deltaSeconds,
  monsterDrainByNodeId = new Map()
}: PowerAllocationInput): PowerAllocationResult => {
  const onlineNodes = nodes.filter((node) => runtimeByNodeId.get(node.id)?.operatingState === 'online');
  const generators = onlineNodes.filter((node) => (node.supplyMw ?? 0) > 0);
  const batteries = onlineNodes.filter((node) => (node.batteryCapacityMwh ?? 0) > 0);
  const consumers = onlineNodes
    .filter((node) => (node.demandMw ?? 0) > 0)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const baseSupplyMw = generators.reduce((sum, node) => sum + (node.supplyMw ?? 0), 0);
  const totalDemandMw = consumers.reduce((sum, node) => (
    sum + (node.demandMw ?? 0) + (monsterDrainByNodeId.get(node.id) ?? 0)
  ), 0);

  let batteryEnergyMwh = batteries.reduce((sum, node) => (
    sum + (runtimeByNodeId.get(node.id)?.batteryEnergyMwh ?? node.batteryInitialMwh ?? 0)
  ), 0);
  const batteryCapacityMwh = batteries.reduce((sum, node) => sum + (node.batteryCapacityMwh ?? 0), 0);
  const maxDischargeMw = batteries.reduce((sum, node) => sum + (node.batteryMaxDischargeMw ?? 0), 0);
  const maxChargeMw = batteries.reduce((sum, node) => sum + (node.batteryMaxChargeMw ?? 0), 0);

  const hours = Math.max(0, deltaSeconds) / 3600;
  const availableDischargeMw = hours > 0
    ? Math.min(maxDischargeMw, batteryEnergyMwh / hours)
    : 0;
  const deficitMw = Math.max(0, totalDemandMw - baseSupplyMw);
  const batteryDischargeMw = Math.min(deficitMw, availableDischargeMw);
  let availableMw = baseSupplyMw + batteryDischargeMw;

  const allocationByNodeId = new Map<PowerNodeId, number>();
  for (const consumer of consumers) {
    const demand = (consumer.demandMw ?? 0) + (monsterDrainByNodeId.get(consumer.id) ?? 0);
    const allocated = Math.min(demand, Math.max(0, availableMw));
    allocationByNodeId.set(consumer.id, allocated);
    availableMw -= allocated;
  }

  const totalAllocatedMw = [...allocationByNodeId.values()].reduce((sum, value) => sum + value, 0);
  const surplusMw = Math.max(0, baseSupplyMw - totalAllocatedMw);
  const availableChargeRoomMw = hours > 0
    ? Math.max(0, (batteryCapacityMwh - batteryEnergyMwh) / hours)
    : 0;
  const batteryChargeMw = Math.min(surplusMw, maxChargeMw, availableChargeRoomMw);

  batteryEnergyMwh += (batteryChargeMw - batteryDischargeMw) * hours;
  batteryEnergyMwh = clamp(batteryEnergyMwh, 0, batteryCapacityMwh);

  return {
    totalSupplyMw: baseSupplyMw + batteryDischargeMw,
    totalDemandMw,
    totalAllocatedMw,
    batteryDischargeMw,
    batteryChargeMw,
    batteryEnergyMwh,
    allocationByNodeId
  };
};
