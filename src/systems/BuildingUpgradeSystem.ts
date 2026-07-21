import type { BuildingBase } from '../buildings/BuildingBase';

export interface UpgradeQuote {
  available: boolean;
  cost: number;
  nextLevel?: number;
  reason?: string;
}

export class BuildingUpgradeSystem {
  static quote(building: BuildingBase): UpgradeQuote {
    if (building.level >= building.getMaxLevel()) {
      return { available: false, cost: 0, reason: '这座设施已经扩建到最大规模' };
    }

    const baseFactor = Math.max(1.1, building.config.upgradeCostFactor ?? 1.65);
    const cost = Math.round(building.config.cost * 0.55 * Math.pow(baseFactor, building.level - 1));
    return { available: true, cost, nextLevel: building.level + 1 };
  }

  static upgrade(building: BuildingBase): UpgradeQuote {
    const quote = this.quote(building);
    if (!quote.available) return quote;
    building.level = quote.nextLevel ?? building.level;
    return quote;
  }
}
