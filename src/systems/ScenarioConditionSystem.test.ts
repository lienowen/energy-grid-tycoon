import { describe, expect, it } from 'vitest';
import { createInitialState } from '../core/GameState';
import {
  ScenarioConditionSystem,
  type ScenarioConditionGroup
} from './ScenarioConditionSystem';

const createState = () => createInitialState({
  levelId: 'test-level',
  cityName: '测试城市',
  money: 6000,
  population: 5000,
  baseDemand: 800,
  powerPrice: 0.5,
  satisfaction: 80,
  researchPoints: 20
});

describe('ScenarioConditionSystem', () => {
  it('evaluates all and any condition groups without level-specific branches', () => {
    const state = createState();
    state.pollution = 24;

    const allGroup: ScenarioConditionGroup = {
      mode: 'all',
      conditions: [
        { metric: 'money', operator: 'gte', target: 5000, label: '资金充足' },
        { metric: 'pollution', operator: 'lte', target: 30, label: '污染受控' }
      ]
    };
    const anyGroup: ScenarioConditionGroup = {
      mode: 'any',
      conditions: [
        { metric: 'money', operator: 'lte', target: -1000, label: '破产' },
        { metric: 'satisfaction', operator: 'lte', target: 90, label: '满意度不足' }
      ]
    };

    expect(ScenarioConditionSystem.evaluateGroup(state, allGroup)).toBe(true);
    expect(ScenarioConditionSystem.evaluateGroup(state, anyGroup)).toBe(true);
  });

  it('calculates bounded progress for composite objectives', () => {
    const state = createState();
    state.money = 4500;
    state.day = 2;

    const objective: ScenarioConditionGroup = {
      mode: 'all',
      conditions: [
        { metric: 'money', operator: 'gte', target: 9000, label: '资金达到目标' },
        { metric: 'day', operator: 'gte', target: 4, label: '坚持运营' }
      ]
    };

    expect(ScenarioConditionSystem.getGroupProgress(state, objective)).toBeCloseTo(0.5);
    state.money = 12000;
    state.day = 6;
    expect(ScenarioConditionSystem.getGroupProgress(state, objective)).toBe(1);
  });

  it('supports upper-bound goals such as pollution control', () => {
    const state = createState();
    state.pollution = 42;
    const condition = {
      metric: 'pollution' as const,
      operator: 'lte' as const,
      target: 28,
      label: '污染不高于 28%'
    };

    expect(ScenarioConditionSystem.evaluate(state, condition)).toBe(false);
    expect(ScenarioConditionSystem.getProgress(state, condition)).toBeGreaterThan(0);
    expect(ScenarioConditionSystem.getProgress(state, condition)).toBeLessThan(1);
  });
});
