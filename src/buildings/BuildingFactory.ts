import { BuildingBase, BuildingConfig, BuildingSnapshot } from './BuildingBase';

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
      pollution: Math.max(0, config.pollution)
    }, snapshot?.instanceId);

    if (snapshot) {
      building.enabled = snapshot.enabled;
      building.setStoredEnergy(snapshot.storedEnergy);
    }

    return building;
  }
}
