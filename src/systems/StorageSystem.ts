import { BuildingBase } from '../buildings/BuildingBase';

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
    tickHours: number
  ): StorageResult {
    const storageUnits = buildings.filter((building) =>
      building.enabled && building.config.category === 'storage'
    );

    let charged = 0;
    let discharged = 0;
    let losses = 0;
    let gridSupply = Math.max(0, generationSupply);

    if (gridSupply > demand) {
      let excess = gridSupply - demand;

      for (const unit of storageUnits) {
        if (excess <= 0) break;
        const capacity = unit.getStorageCapacity();
        const room = Math.max(0, capacity - unit.storedEnergy);
        const efficiency = unit.getStorageEfficiency();
        const inputLimit = unit.getChargeRate() * tickHours;
        const input = Math.min(excess, inputLimit, room / efficiency);
        const storedGain = input * efficiency;

        unit.setStoredEnergy(unit.storedEnergy + storedGain);
        charged += storedGain;
        losses += input - storedGain;
        excess -= input;
        gridSupply -= input;
      }
    } else if (gridSupply < demand) {
      let shortage = demand - gridSupply;

      for (const unit of storageUnits) {
        if (shortage <= 0) break;
        const efficiency = unit.getStorageEfficiency();
        const outputLimit = unit.getDischargeRate() * tickHours;
        const deliverable = Math.min(shortage, outputLimit, unit.storedEnergy * efficiency);
        const energyDraw = deliverable / efficiency;

        unit.setStoredEnergy(unit.storedEnergy - energyDraw);
        discharged += deliverable;
        losses += energyDraw - deliverable;
        shortage -= deliverable;
        gridSupply += deliverable;
      }
    }

    const storedEnergy = storageUnits.reduce((sum, unit) => sum + unit.storedEnergy, 0);
    const capacity = storageUnits.reduce((sum, unit) => sum + unit.getStorageCapacity(), 0);

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
