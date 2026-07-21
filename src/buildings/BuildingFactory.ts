import type { BuildingSnapshot } from '../core/SaveSchema';
import { BuildingBase, BuildingConfig } from './BuildingBase';

export class BuildingFactory {
  static create(config: BuildingConfig, snapshot?: BuildingSnapshot): BuildingBase {
    if (!config.id || !config.name || !config.assetId) {
      throw new Error('Invalid building configuration');
    }

    const building = new BuildingBase({
      ...config,
      cost: Math.max(0, config.cost),
      maintenance: Math.max(0, config.maintenance),
      power: Math.max(0, config.power),
      capacity: Math.max(0, config.capacity ?? 0),
      chargeRate: Math.max(0, config.chargeRate ?? config.power),
      dischargeRate: Math.max(0, config.dischargeRate ?? config.power),
      efficiency: Math.min(1, Math.max(0.01, config.efficiency ?? 0.9)),
      pollution: Math.max(0, config.pollution),
      maxLevel: Math.max(1, Math.floor(config.maxLevel ?? 3)),
      upgradeCostFactor: Math.max(1.1, config.upgradeCostFactor ?? 1.65),
      upgradePowerBonus: Math.max(0, config.upgradePowerBonus ?? 0.22),
      upgradeMaintenanceBonus: Math.max(0, config.upgradeMaintenanceBonus ?? 0.12),
      upgradeCapacityBonus: Math.max(0, config.upgradeCapacityBonus ?? 0.28)
    }, snapshot?.instanceId);

    if (snapshot) {
      building.enabled = snapshot.enabled;
      building.level = Math.min(building.getMaxLevel(), Math.max(1, Math.floor(snapshot.level ?? 1)));
      building.setStoredEnergy(snapshot.storedEnergy);
    }

    return building;
  }
}
