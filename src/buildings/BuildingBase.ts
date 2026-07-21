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
  chargeRate?: number;
  dischargeRate?: number;
  efficiency?: number;
  pollution: number;
  description: string;
  specialLogic?: string;
}

export interface BuildingSnapshot {
  instanceId: string;
  configId: string;
  enabled: boolean;
  storedEnergy: number;
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

  getStorageCapacity(): number {
    return this.config.category === 'storage' ? Math.max(0, this.config.capacity ?? 0) : 0;
  }

  getChargeRate(): number {
    return this.config.category === 'storage' ? Math.max(0, this.config.chargeRate ?? this.config.power) : 0;
  }

  getDischargeRate(): number {
    return this.config.category === 'storage' ? Math.max(0, this.config.dischargeRate ?? this.config.power) : 0;
  }

  getStorageEfficiency(): number {
    return Math.min(1, Math.max(0.01, this.config.efficiency ?? 0.9));
  }

  setStoredEnergy(value: number): void {
    this.storedEnergy = Math.min(this.getStorageCapacity(), Math.max(0, value));
  }

  toSnapshot(): BuildingSnapshot {
    return {
      instanceId: this.instanceId,
      configId: this.config.id,
      enabled: this.enabled,
      storedEnergy: this.storedEnergy
    };
  }
}
