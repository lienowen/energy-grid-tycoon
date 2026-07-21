export interface LevelConfig {
  id: number;
  population: number;
  powerDemand: number;
  buildings: string[];
}

export class LevelLoader {
  static load(config: LevelConfig) {
    return {
      ...config,
      loaded: true
    };
  }
}
