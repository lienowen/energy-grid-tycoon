import type { GameState } from '../core/GameState';

export type ScenarioMetric =
  | 'money'
  | 'population'
  | 'satisfaction'
  | 'pollution'
  | 'score'
  | 'day'
  | 'hour'
  | 'supplyRatio'
  | 'researchPoints'
  | 'unlockedTechnologies'
  | 'totalRevenue'
  | 'totalEnergyServed'
  | 'totalShortage'
  | 'storageEnergy'
  | 'storageCapacity';

export type ScenarioOperator = 'gte' | 'lte' | 'eq';
export type ScenarioConditionMode = 'all' | 'any';

export interface ScenarioCondition {
  metric: ScenarioMetric;
  operator: ScenarioOperator;
  target: number;
  label: string;
}

export interface ScenarioConditionGroup {
  mode: ScenarioConditionMode;
  conditions: ScenarioCondition[];
}

const metricReaders: Record<ScenarioMetric, (state: GameState) => number> = {
  money: (state) => state.money,
  population: (state) => state.population,
  satisfaction: (state) => state.satisfaction,
  pollution: (state) => state.pollution,
  score: (state) => state.score,
  day: (state) => state.day,
  hour: (state) => state.hour,
  supplyRatio: (state) => state.supplyRatio,
  researchPoints: (state) => state.researchPoints,
  unlockedTechnologies: (state) => state.unlockedTechnologyIds.length,
  totalRevenue: (state) => state.totalRevenue,
  totalEnergyServed: (state) => state.totalEnergyServed,
  totalShortage: (state) => state.totalShortage,
  storageEnergy: (state) => state.storageEnergy,
  storageCapacity: (state) => state.storageCapacity
};

export class ScenarioConditionSystem {
  static getValue(state: GameState, condition: ScenarioCondition): number {
    return metricReaders[condition.metric](state);
  }

  static evaluate(state: GameState, condition: ScenarioCondition): boolean {
    const value = this.getValue(state, condition);
    if (condition.operator === 'gte') return value >= condition.target;
    if (condition.operator === 'lte') return value <= condition.target;
    return Math.abs(value - condition.target) < 0.0001;
  }

  static evaluateGroup(state: GameState, group: ScenarioConditionGroup): boolean {
    if (group.conditions.length === 0) return false;
    return group.mode === 'all'
      ? group.conditions.every((condition) => this.evaluate(state, condition))
      : group.conditions.some((condition) => this.evaluate(state, condition));
  }

  static getProgress(state: GameState, condition: ScenarioCondition): number {
    const value = this.getValue(state, condition);
    if (this.evaluate(state, condition)) return 1;

    if (condition.operator === 'gte') {
      if (condition.target <= 0) return 0;
      return Math.min(1, Math.max(0, value / condition.target));
    }

    if (condition.operator === 'lte') {
      const distance = value - condition.target;
      const scale = Math.max(Math.abs(condition.target), Math.abs(value), 1);
      return Math.min(1, Math.max(0, 1 - distance / scale));
    }

    const scale = Math.max(Math.abs(condition.target), 1);
    return Math.min(1, Math.max(0, 1 - Math.abs(value - condition.target) / scale));
  }

  static getGroupProgress(state: GameState, group: ScenarioConditionGroup): number {
    if (group.conditions.length === 0) return 0;
    const progresses = group.conditions.map((condition) => this.getProgress(state, condition));
    return group.mode === 'all' ? Math.min(...progresses) : Math.max(...progresses);
  }
}
