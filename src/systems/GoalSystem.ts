import { GameState } from '../core/GameState';
import { LevelConfig } from './LevelLoader';

export class GoalSystem {
  static isCompleted(state: GameState, level: LevelConfig): boolean {
    switch (level.goal.type) {
      case 'money':
        return state.money >= level.goal.target;
      case 'satisfaction':
        return state.satisfaction >= level.goal.target && state.day >= 3;
      case 'population':
        return state.population >= level.goal.target;
      default:
        return false;
    }
  }

  static isFailed(state: GameState, level: LevelConfig): boolean {
    return state.money <= level.failMoney || state.satisfaction <= 5 || state.population <= 0;
  }

  static getProgress(state: GameState, level: LevelConfig): number {
    if (level.goal.type === 'satisfaction') {
      const satisfactionProgress = state.satisfaction / Math.max(level.goal.target, 1);
      const survivalProgress = state.day / 3;
      return Math.min(1, Math.max(0, Math.min(satisfactionProgress, survivalProgress)));
    }

    const value = level.goal.type === 'money' ? state.money : state.population;
    return Math.min(1, Math.max(0, value / Math.max(level.goal.target, 1)));
  }
}
