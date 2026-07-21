export interface GameState {
  money: number;
  population: number;
  powerDemand: number;
  powerSupply: number;
  satisfaction: number;
  pollution: number;
}

export const createDefaultState = (): GameState => ({
  money: 10000,
  population: 5000,
  powerDemand: 1000,
  powerSupply: 0,
  satisfaction: 100,
  pollution: 0
});
