export interface EconomyInput {
  energySold: number;
  pricePerUnit: number;
  operationCost: number;
}

export class EconomySystem {
  static calculate(input: EconomyInput) {
    const income = input.energySold * input.pricePerUnit;
    const profit = income - input.operationCost;

    return {
      income,
      profit
    };
  }
}
