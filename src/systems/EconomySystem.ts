export interface EconomyInput {
  energySold: number;
  pricePerUnit: number;
  operationCost: number;
  tickHours: number;
}

export interface EconomyResult {
  revenue: number;
  operationCost: number;
  profit: number;
}

export class EconomySystem {
  static calculate(input: EconomyInput): EconomyResult {
    const tickFactor = Math.max(input.tickHours, 0);
    const revenue = Math.max(input.energySold, 0) * Math.max(input.pricePerUnit, 0) * tickFactor;
    const operationCost = Math.max(input.operationCost, 0) * tickFactor;

    return {
      revenue,
      operationCost,
      profit: revenue - operationCost
    };
  }
}