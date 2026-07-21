export type BuildingCategory = 'generation' | 'storage' | 'grid';

export interface BuildingConfig {
  id: string;
  name: string;
  category: BuildingCategory;
  assetId: string;
  cost: number;
  maintenance: number;
  power: number;
  capacity?: number;
  pollution: number;
  description: string;
  specialLogic?: string;
}

export class BuildingBase {
  readonly instanceId: string;
  readonly config: BuildingConfig;
  enabled = true;
  storedEnergy = 0;

  constructor(config: BuildingConfig, instanceId = crypto.randomUUID()) {
    this.config = config;
    this.instanceId = instanceId;
  }

  getPowerOutput(outputMultiplier = 1): number {
    if (!this.enabled || this.config.category !== 'generation') return 0;
    return Math.max(0, this.config.power * outputMultiplier);
  }

  getMaintenance(): number {
    return this.enabled ? this.config.maintenance : 0;
  }

  getPollution(): number {
    return this.enabled ? this.config.pollution : 0;
  }
}