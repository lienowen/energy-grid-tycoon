export interface PowerInput {
  supply: number;
  demand: number;
  gridLossRate?: number;
}

export interface PowerResult {
  grossSupply: number;
  netSupply: number;
  demand: number;
  supplyRatio: number;
  shortage: number;
  surplus: number;
  energyServed: number;
  stable: boolean;
}

export class PowerSystem {
  static calculate(input: PowerInput): PowerResult {
    const lossRate = Math.min(Math.max(input.gridLossRate ?? 0.04, 0), 0.35);
    const grossSupply = Math.max(0, input.supply);
    const demand = Math.max(0, input.demand);
    const netSupply = grossSupply * (1 - lossRate);
    const energyServed = Math.min(netSupply, demand);
    const supplyRatio = demand === 0 ? 1 : Math.min(netSupply / demand, 1.5);

    return {
      grossSupply,
      netSupply,
      demand,
      supplyRatio,
      shortage: Math.max(demand - netSupply, 0),
      surplus: Math.max(netSupply - demand, 0),
      energyServed,
      stable: supplyRatio >= 0.98
    };
  }
}