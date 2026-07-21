import { GameState } from '../core/GameState';
import { LevelConfig } from './LevelLoader';
import { ScenarioConditionSystem } from './ScenarioConditionSystem';

export class GoalSystem {
  static isCompleted(state: GameState, level: LevelConfig): boolean {
    return ScenarioConditionSystem.evaluateGroup(state, level.rules.objective);
  }

  static isFailed(state: GameState, level: LevelConfig): boolean {
    return ScenarioConditionSystem.evaluateGroup(state, level.rules.failure);
  }

  static getProgress(state: GameState, level: LevelConfig): number {
    return ScenarioConditionSystem.getGroupProgress(state, level.rules.objective);
  }
}
