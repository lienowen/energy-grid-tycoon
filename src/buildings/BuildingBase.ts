import type { BuildingSnapshot } from '../core/SaveSchema';

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
  requiredTechnologyId?: string;
  maxLevel?: number;
  upgradeCostFactor?: number;
  upgradePowerBonus?: number;
  upgradeMaintenanceBonus?: number;
  upgradeCapacityBonus?: number;
}

export class BuildingBase {
  readonly instanceId: string;
  readonly config: BuildingConfig;
  enabled = true;
  storedEnergy = 0;
  level = 1;

  constructor(config: BuildingConfig, instanceId: string = crypto.randomUUID()) {
    this.config = config;
    this.instanceId = instanceId;
  }

  getMaxLevel(): number {
    return Math.max(1, Math.floor(this.config.maxLevel ?? 3));
  }

  getPowerOutput(outputMultiplier = 1): number {
    if (!this.enabled || this.config.category !== 'generation') return 0;
    return Math.max(0, this.config.power * this.getPowerLevelMultiplier() * outputMultiplier);
  }

  getMaintenance(): number {
    if (!this.enabled) return 0;
    const bonus = Math.max(0, this.config.upgradeMaintenanceBonus ?? 0.12);
    return this.config.maintenance * (1 + (this.level - 1) * bonus);
  }

  getPollution(): number {
    return this.enabled ? this.config.pollution : 0;
  }

  getStorageCapacity(capacityMultiplier = 1): number {
    if (this.config.category !== 'storage') return 0;
    const bonus = Math.max(0, this.config.upgradeCapacityBonus ?? 0.28);
    const levelMultiplier = 1 + (this.level - 1) * bonus;
    return Math.max(0, (this.config.capacity ?? 0) * levelMultiplier * capacityMultiplier);
  }

  getChargeRate(rateMultiplier = 1): number {
    if (this.config.category !== 'storage') return 0;
    return Math.max(0, (this.config.chargeRate ?? this.config.power) * this.getPowerLevelMultiplier() * rateMultiplier);
  }

  getDischargeRate(rateMultiplier = 1): number {
    if (this.config.category !== 'storage') return 0;
    return Math.max(0, (this.config.dischargeRate ?? this.config.power) * this.getPowerLevelMultiplier() * rateMultiplier);
  }

  getStorageEfficiency(efficiencyBonus = 0): number {
    return Math.min(0.99, Math.max(0.01, (this.config.efficiency ?? 0.9) + efficiencyBonus));
  }

  setStoredEnergy(value: number, capacityMultiplier = 1): void {
    this.storedEnergy = Math.min(this.getStorageCapacity(capacityMultiplier), Math.max(0, value));
  }

  toSnapshot(): BuildingSnapshot {
    return {
      instanceId: this.instanceId,
      configId: this.config.id,
      enabled: this.enabled,
      storedEnergy: this.storedEnergy,
      level: this.level
    };
  }

  private getPowerLevelMultiplier(): number {
    const bonus = Math.max(0, this.config.upgradePowerBonus ?? 0.22);
    return 1 + (this.level - 1) * bonus;
  }
}
