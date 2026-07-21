import { BuildingBase, BuildingConfig } from './BuildingBase';

export class BuildingFactory {
  static create(config: BuildingConfig): BuildingBase {
    if (!config.id || !config.name || !config.assetId) {
      throw new Error('Invalid building configuration');
    }

    return new BuildingBase({
      ...config,
      cost: Math.max(0, config.cost),
      maintenance: Math.max(0, config.maintenance),
      power: Math.max(0, config.power),
      pollution: Math.max(0, config.pollution)
    });
  }
}