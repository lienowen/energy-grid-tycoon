import { BuildingManager } from '../buildings/BuildingManager';
import { GameState } from '../core/GameState';
import { SpecialLogicSystem } from '../gameplay/SpecialLogicSystem';
import { EconomyResult, EconomySystem } from './EconomySystem';
import { EventEffects } from './EventSystem';
import { PowerResult, PowerSystem } from './PowerSystem';
import { StorageResult, StorageSystem } from './StorageSystem';

export interface SimulationResult {
  state: GameState;
  power: PowerResult;
  economy: EconomyResult;
  storage: StorageResult;
}

export class SimulationSystem {
  static tick(
    state: GameState,
    buildings: BuildingManager,
    effects: EventEffects,
    tickHours = 1
  ): SimulationResult {
    const peakCurve = 0.82 + 0.28 * Math.max(0, Math.sin(((state.hour - 7) / 24) * Math.PI * 2));
    const demand = state.baseDemand * peakCurve * effects.demandMultiplier;
    const gridLossRate = 0.04;

    const generationSupply = buildings.getTotalPower((building) =>
      SpecialLogicSystem.getOutputMultiplier(building, {
        hour: state.hour,
        eventOutputMultiplier: effects.outputMultiplier
      })
    );

    const requiredGrossSupply = demand / (1 - gridLossRate);
    const storage = StorageSystem.balance(
      generationSupply,
      requiredGrossSupply,
      buildings.getBuildings(),
      tickHours
    );

    const power = PowerSystem.calculate({
      supply: storage.gridSupply,
      demand,
      gridLossRate
    });

    const economy = EconomySystem.calculate({
      energySold: power.energyServed,
      pricePerUnit: state.powerPrice * effects.priceMultiplier,
      operationCost: buildings.getTotalMaintenance() * (effects.maintenanceMultiplier ?? 1),
      tickHours
    });

    const pricePressure = Math.max(0, state.powerPrice - 0.62) * -0.5 * tickHours;
    const satisfactionDelta = power.stable
      ? 0.35 * tickHours
      : -Math.min(4 * tickHours, power.shortage / Math.max(demand, 1) * 8 * tickHours);
    const satisfaction = Math.min(
      100,
      Math.max(0, state.satisfaction + satisfactionDelta + effects.satisfactionDelta * tickHours + pricePressure)
    );
    const populationGrowth = satisfaction >= 75
      ? Math.ceil(state.population * 0.0008 * tickHours)
      : -Math.ceil(state.population * 0.0005 * tickHours);
    const pollution = Math.min(100, Math.max(0, buildings.getTotalPollution() * 1.4));

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
      powerSupply: power.netSupply,
      supplyRatio: power.supplyRatio,
      energySold: power.energyServed,
      satisfaction,
      pollution,
      score: Math.max(0, state.score + economy.profit * 0.1 + satisfaction * 0.2),
      storageEnergy: storage.storedEnergy,
      storageCapacity: storage.capacity,
      storageFlow: storage.flow
    };

    return { state: nextState, power, economy, storage };
  }
}
