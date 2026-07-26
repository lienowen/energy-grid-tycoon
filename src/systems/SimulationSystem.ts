import type { BuildingBase } from '../buildings/BuildingBase';
import { BuildingManager } from '../buildings/BuildingManager';
import { GameState } from '../core/GameState';
import { SpecialLogicSystem } from '../gameplay/SpecialLogicSystem';
import { EconomyResult, EconomySystem } from './EconomySystem';
import { EventEffects } from './EventSystem';
import {
  GridGraphSystem,
  type GridNetworkConfig,
  type GridSourceInput
} from './GridGraphSystem';
import { GridNetworkRegistry } from './GridNetworkRegistry';
import { PowerResult, PowerSystem } from './PowerSystem';
import {
  neutralSimulationModifiers,
  type SimulationModifiers
} from './SimulationModifiers';
import { StorageResult, StorageSystem } from './StorageSystem';

export interface SimulationResult {
  state: GameState;
  power: PowerResult;
  economy: EconomyResult;
  storage: StorageResult;
}

interface GenerationOutput {
  building: BuildingBase;
  output: number;
}

export class SimulationSystem {
  static tick(
    state: GameState,
    buildings: BuildingManager,
    effects: EventEffects,
    tickHours = 1,
    modifiers: SimulationModifiers = neutralSimulationModifiers()
  ): SimulationResult {
    const peakCurve = 0.82 + 0.28 * Math.max(0, Math.sin(((state.hour - 7) / 24) * Math.PI * 2));
    const demand = state.baseDemand * peakCurve * effects.demandMultiplier * modifiers.demandMultiplier;
    const gridLossRate = 0.04;
    const gridNetwork = GridNetworkRegistry.resolve(state.levelId);

    const allGenerationOutputs = buildings.getBuildings()
      .filter((building) => building.config.category === 'generation')
      .map((building): GenerationOutput => ({
        building,
        output: building.getPowerOutput(
          SpecialLogicSystem.getOutputMultiplier(building, {
            hour: state.hour,
            eventOutputMultiplier: effects.outputMultiplier
          }) * modifiers.generationMultiplier
        )
      }));
    const generationOutputs = gridNetwork
      ? allGenerationOutputs.filter((item) =>
        Boolean(this.findSourceNodeId(gridNetwork, item.building, 'generation'))
      )
      : allGenerationOutputs;
    const generationSupply = generationOutputs.reduce((sum, item) => sum + item.output, 0);

    const requiredGrossSupply = demand / (1 - gridLossRate);
    const storageParticipants = gridNetwork
      ? buildings.getStorageBuildings().filter((building) =>
        Boolean(this.findSourceNodeId(gridNetwork, building, 'storage'))
      )
      : buildings.getBuildings();
    const storage = StorageSystem.balance(
      generationSupply,
      requiredGrossSupply,
      storageParticipants,
      tickHours,
      {
        capacityMultiplier: modifiers.storageCapacityMultiplier,
        rateMultiplier: modifiers.storageRateMultiplier,
        efficiencyBonus: modifiers.storageEfficiencyBonus
      }
    );

    const gridDispatch = gridNetwork
      ? GridGraphSystem.dispatch({
        network: gridNetwork,
        demand,
        capacityBase: state.baseDemand,
        sources: this.buildGridSources(
          gridNetwork,
          generationOutputs,
          storageParticipants,
          storage,
          gridLossRate,
          modifiers
        )
      })
      : undefined;

    const power = PowerSystem.calculate({
      supply: storage.gridSupply,
      demand,
      gridLossRate,
      deliveredSupply: gridDispatch?.servedDemand,
      gridDispatch
    });

    const economy = EconomySystem.calculate({
      energySold: power.energyServed,
      pricePerUnit: state.powerPrice * effects.priceMultiplier * modifiers.priceMultiplier,
      operationCost: buildings.getTotalMaintenance()
        * (effects.maintenanceMultiplier ?? 1)
        * modifiers.maintenanceMultiplier,
      tickHours
    });

    const pricePressure = Math.max(0, state.powerPrice - 0.62) * -0.5 * tickHours;
    const satisfactionDelta = power.stable
      ? 0.35 * tickHours
      : -Math.min(4 * tickHours, power.shortage / Math.max(demand, 1) * 8 * tickHours);
    const satisfaction = Math.min(
      100,
      Math.max(
        0,
        state.satisfaction
          + satisfactionDelta
          + effects.satisfactionDelta * tickHours
          + modifiers.satisfactionDeltaPerHour * tickHours
          + pricePressure
      )
    );
    const populationGrowth = satisfaction >= 75
      ? Math.ceil(state.population * 0.0008 * tickHours)
      : -Math.ceil(state.population * 0.0005 * tickHours);
    const pollution = Math.min(
      100,
      Math.max(0, buildings.getTotalPollution() * 1.4 * modifiers.pollutionMultiplier)
    );

    let hour = state.hour + tickHours;
    let day = state.day;
    while (hour >= 24) {
      hour -= 24;
      day += 1;
    }

    const nextState: GameState = {
      ...state,
      day,
      hour,
      money: state.money + economy.profit,
      population: Math.max(0, state.population + populationGrowth),
      powerDemand: demand,
      powerSupply: power.energyServed,
      supplyRatio: power.supplyRatio,
      energySold: power.energyServed,
      satisfaction,
      pollution,
      score: Math.max(0, state.score + economy.profit * 0.1 + satisfaction * 0.2),
      storageEnergy: storage.storedEnergy,
      storageCapacity: storage.capacity,
      storageFlow: storage.flow,
      totalRevenue: state.totalRevenue + economy.revenue,
      totalEnergyServed: state.totalEnergyServed + power.energyServed * tickHours,
      totalShortage: state.totalShortage + power.shortage * tickHours
    };

    return { state: nextState, power, economy, storage };
  }

  private static buildGridSources(
    network: GridNetworkConfig,
    generationOutputs: readonly GenerationOutput[],
    storageParticipants: readonly BuildingBase[],
    storage: StorageResult,
    gridLossRate: number,
    modifiers: SimulationModifiers
  ): GridSourceInput[] {
    const sourceByNode = new Map<string, number>();
    const generationSupply = generationOutputs.reduce((sum, item) => sum + item.output, 0);
    const chargingInput = storage.charged > 0 ? storage.charged + storage.losses : 0;
    const generationScale = generationSupply > 0
      ? Math.max(0, generationSupply - chargingInput) / generationSupply
      : 0;
    const netMultiplier = 1 - gridLossRate;

    for (const item of generationOutputs) {
      const nodeId = this.findSourceNodeId(network, item.building, 'generation');
      if (!nodeId) continue;
      sourceByNode.set(
        nodeId,
        (sourceByNode.get(nodeId) ?? 0) + item.output * generationScale * netMultiplier
      );
    }

    if (storage.discharged > 0) {
      const connectedStorage = storageParticipants
        .map((building) => ({
          building,
          nodeId: this.findSourceNodeId(network, building, 'storage'),
          weight: building.getDischargeRate(modifiers.storageRateMultiplier)
        }))
        .filter((item): item is { building: BuildingBase; nodeId: string; weight: number } =>
          Boolean(item.nodeId) && item.weight > 0
        );
      const totalWeight = connectedStorage.reduce((sum, item) => sum + item.weight, 0);

      for (const item of connectedStorage) {
        const share = totalWeight > 0 ? item.weight / totalWeight : 0;
        sourceByNode.set(
          item.nodeId,
          (sourceByNode.get(item.nodeId) ?? 0) + storage.discharged * share * netMultiplier
        );
      }
    }

    return [...sourceByNode].map(([nodeId, available]) => ({ nodeId, available }));
  }

  private static findSourceNodeId(
    network: GridNetworkConfig,
    building: BuildingBase,
    kind: 'generation' | 'storage'
  ): string | undefined {
    return network.nodes.find((node) => {
      if (node.kind !== kind) return false;
      if (node.plotIds && node.plotIds.length > 0) {
        if (!building.placementId || !node.plotIds.includes(building.placementId)) return false;
        return !node.facilityConfigIds
          || node.facilityConfigIds.length === 0
          || node.facilityConfigIds.includes(building.config.id);
      }
      return Boolean(node.facilityConfigIds?.includes(building.config.id));
    })?.id;
  }
}
