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
  storageEnergy: number;
  storageCapacity: number;
  storageFlow: number;
  researchPoints: number;
  unlockedTechnologyIds: string[];
  activePolicyId?: string;
  totalRevenue: number;
  totalEnergyServed: number;
  totalShortage: number;
  randomState: number;
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
  satisfaction?: number;
  researchPoints?: number;
  unlockedTechnologyIds?: string[];
  randomSeed?: number;
}

const normalizeRandomState = (seed: number | undefined): number => {
  const value = Math.floor(seed ?? 1) >>> 0;
  return value === 0 ? 1 : value;
};

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
  satisfaction: Math.min(100, Math.max(0, input.satisfaction ?? 82)),
  pollution: 0,
  score: 0,
  storageEnergy: 0,
  storageCapacity: 0,
  storageFlow: 0,
  researchPoints: Math.max(0, input.researchPoints ?? 0),
  unlockedTechnologyIds: [...new Set(input.unlockedTechnologyIds ?? [])],
  totalRevenue: 0,
  totalEnergyServed: 0,
  totalShortage: 0,
  randomState: normalizeRandomState(input.randomSeed),
  completed: false,
  failed: false
});
