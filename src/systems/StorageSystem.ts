import { BuildingBase } from '../buildings/BuildingBase';

export interface StorageModifiers {
  capacityMultiplier?: number;
  rateMultiplier?: number;
  efficiencyBonus?: number;
}

export interface StorageResult {
  generationSupply: number;
  gridSupply: number;
  charged: number;
  discharged: number;
  losses: number;
  storedEnergy: number;
  capacity: number;
  flow: number;
}

export class StorageSystem {
  static balance(
    generationSupply: number,
    demand: number,
    buildings: readonly BuildingBase[],
    tickHours: number,
    modifiers: StorageModifiers = {}
  ): StorageResult {
    const storageUnits = buildings.filter((building) =>
      building.enabled && building.config.category === 'storage'
    );
    const capacityMultiplier = Math.max(0.1, modifiers.capacityMultiplier ?? 1);
    const rateMultiplier = Math.max(0.1, modifiers.rateMultiplier ?? 1);
    const efficiencyBonus = modifiers.efficiencyBonus ?? 0;

    let charged = 0;
    let discharged = 0;
    let losses = 0;
    let gridSupply = Math.max(0, generationSupply);

    for (const unit of storageUnits) {
      unit.setStoredEnergy(unit.storedEnergy, capacityMultiplier);
    }

    if (gridSupply > demand) {
      let excess = gridSupply - demand;

      for (const unit of storageUnits) {
        if (excess <= 0) break;
        const capacity = unit.getStorageCapacity(capacityMultiplier);
        const room = Math.max(0, capacity - unit.storedEnergy);
        const efficiency = unit.getStorageEfficiency(efficiencyBonus);
        const inputLimit = unit.getChargeRate(rateMultiplier) * tickHours;
        const input = Math.min(excess, inputLimit, room / efficiency);
        const storedGain = input * efficiency;

        unit.setStoredEnergy(unit.storedEnergy + storedGain, capacityMultiplier);
        charged += storedGain;
        losses += input - storedGain;
        excess -= input;
        gridSupply -= input;
      }
    } else if (gridSupply < demand) {
      let shortage = demand - gridSupply;

      for (const unit of storageUnits) {
        if (shortage <= 0) break;
        const efficiency = unit.getStorageEfficiency(efficiencyBonus);
        const outputLimit = unit.getDischargeRate(rateMultiplier) * tickHours;
        const deliverable = Math.min(shortage, outputLimit, unit.storedEnergy * efficiency);
        const energyDraw = deliverable / efficiency;

        unit.setStoredEnergy(unit.storedEnergy - energyDraw, capacityMultiplier);
        discharged += deliverable;
        losses += energyDraw - deliverable;
        shortage -= deliverable;
        gridSupply += deliverable;
      }
    }

    const storedEnergy = storageUnits.reduce((sum, unit) => sum + unit.storedEnergy, 0);
    const capacity = storageUnits.reduce(
      (sum, unit) => sum + unit.getStorageCapacity(capacityMultiplier),
      0
    );

    return {
      generationSupply,
      gridSupply,
      charged,
      discharged,
      losses,
      storedEnergy,
      capacity,
      flow: discharged - charged
    };
  }
}
