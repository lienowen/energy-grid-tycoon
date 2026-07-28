import type { CityPlotZone } from '../core/CityMapConfig';
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
  placementZones?: CityPlotZone[];
  specialLogic?: string;
  requiredTechnologyId?: string;
  maxLevel?: number;
  upgradeCostFactor?: number;
  upgradePowerBonus?: number;
  upgradeMaintenanceBonus?: number;
  upgradeCapacityBonus?: number;
  constructionHours?: number;
}

export class BuildingBase {
  readonly instanceId: string;
  readonly config: BuildingConfig;
  enabled = true;
  storedEnergy = 0;
  level = 1;
  placementId?: string;
  constructionHoursTotal = 0;
  constructionHoursRemaining = 0;

  constructor(config: BuildingConfig, instanceId: string = crypto.randomUUID()) {
    this.config = config;
    this.instanceId = instanceId;
  }

  get constructionProgress(): number {
    if (this.constructionHoursTotal <= 0) return 1;
    return Math.min(1, Math.max(
      0,
      1 - this.constructionHoursRemaining / this.constructionHoursTotal
    ));
  }

  get underConstruction(): boolean {
    return this.constructionHoursRemaining > 0;
  }

  place(plotId: string): void {
    this.placementId = plotId;
  }

  beginConstruction(hours: number): void {
    const duration = Math.max(1, hours);
    this.constructionHoursTotal = duration;
    this.constructionHoursRemaining = duration;
    this.enabled = false;
    this.storedEnergy = 0;
  }

  restoreConstruction(totalHours: number, remainingHours: number): void {
    const total = Math.max(1, totalHours);
    const remaining = Math.min(total, Math.max(0, remainingHours));
    this.constructionHoursTotal = total;
    this.constructionHoursRemaining = remaining;
    if (remaining > 0) {
      this.enabled = false;
      this.storedEnergy = 0;
    }
  }

  advanceConstruction(deltaHours: number): boolean {
    if (!this.underConstruction || deltaHours <= 0) return false;
    this.constructionHoursRemaining = Math.max(0, this.constructionHoursRemaining - deltaHours);
    if (this.constructionHoursRemaining > 0) return false;
    this.enabled = true;
    return true;
  }

  getMaxLevel(): number {
    return Math.max(1, Math.floor(this.config.maxLevel ?? 3));
  }

  getPowerOutput(outputMultiplier = 1): number {
    if (!this.enabled || this.underConstruction || this.config.category !== 'generation') return 0;
    return Math.max(0, this.config.power * this.getPowerLevelMultiplier() * outputMultiplier);
  }

  getMaintenance(): number {
    if (!this.enabled || this.underConstruction) return 0;
    const bonus = Math.max(0, this.config.upgradeMaintenanceBonus ?? 0.12);
    return this.config.maintenance * (1 + (this.level - 1) * bonus);
  }

  getPollution(): number {
    return this.enabled && !this.underConstruction ? this.config.pollution : 0;
  }

  getStorageCapacity(capacityMultiplier = 1): number {
    if (this.underConstruction || this.config.category !== 'storage') return 0;
    const bonus = Math.max(0, this.config.upgradeCapacityBonus ?? 0.28);
    const levelMultiplier = 1 + (this.level - 1) * bonus;
    return Math.max(0, (this.config.capacity ?? 0) * levelMultiplier * capacityMultiplier);
  }

  getChargeRate(rateMultiplier = 1): number {
    if (this.underConstruction || this.config.category !== 'storage') return 0;
    return Math.max(0, (this.config.chargeRate ?? this.config.power) * this.getPowerLevelMultiplier() * rateMultiplier);
  }

  getDischargeRate(rateMultiplier = 1): number {
    if (this.underConstruction || this.config.category !== 'storage') return 0;
    return Math.max(0, (this.config.dischargeRate ?? this.config.power) * this.getPowerLevelMultiplier() * rateMultiplier);
  }

  getStorageEfficiency(efficiencyBonus = 0): number {
    return Math.min(0.99, Math.max(0.01, (this.config.efficiency ?? 0.9) + efficiencyBonus));
  }

  setStoredEnergy(value: number, capacityMultiplier = 1): void {
    this.storedEnergy = Math.min(this.getStorageCapacity(capacityMultiplier), Math.max(0, value));
  }

  toSnapshot(): BuildingSnapshot {
    const snapshot: BuildingSnapshot = {
      instanceId: this.instanceId,
      configId: this.config.id,
      enabled: this.enabled,
      storedEnergy: this.storedEnergy,
      level: this.level
    };
    if (this.placementId) snapshot.placementId = this.placementId;
    if (this.underConstruction) {
      snapshot.constructionHoursTotal = this.constructionHoursTotal;
      snapshot.constructionHoursRemaining = this.constructionHoursRemaining;
    }
    return snapshot;
  }

  private getPowerLevelMultiplier(): number {
    const bonus = Math.max(0, this.config.upgradePowerBonus ?? 0.22);
    return 1 + (this.level - 1) * bonus;
  }
}
