export type GameSpeed = 0 | 1 | 2 | 4;

export interface GameState {
  levelId: string;
  cityName: string;
  day: number;
  hour: number;
  speed: GameSpeed;
  money: number;
  population: number;
  baseDemand: number;
  powerDemand: number;
  powerSupply: number;
  supplyRatio: number;
  energySold: number;
  powerPrice: number;
  satisfaction: number;
  pollution: number;
  score: number;
  activeEventId?: string;
  completed: boolean;
  failed: boolean;
}

export interface InitialStateInput {
  levelId: string;
  cityName: string;
  money: number;
  population: number;
  baseDemand: number;
  powerPrice: number;
}

export const createInitialState = (input: InitialStateInput): GameState => ({
  levelId: input.levelId,
  cityName: input.cityName,
  day: 1,
  hour: 6,
  speed: 1,
  money: input.money,
  population: input.population,
  baseDemand: input.baseDemand,
  powerDemand: input.baseDemand,
  powerSupply: 0,
  supplyRatio: 0,
  energySold: 0,
  powerPrice: input.powerPrice,
  satisfaction: 82,
  pollution: 0,
  score: 0,
  completed: false,
  failed: false
});