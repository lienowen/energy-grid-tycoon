import { describe, expect, it } from 'vitest';
import { createInitialState } from '../core/GameState';
import { RuleEngine } from './RuleEngine';
import type { RuleComponentConfig } from './RuleTypes';

const createState = () => createInitialState({
  levelId: 'rule-test',
  cityName: '规则测试城',
  money: 1000,
  population: 5000,
  baseDemand: 800,
  powerPrice: 0.5,
  satisfaction: 70,
  researchPoints: 0
});

describe('RuleEngine', () => {
  it('combines growth, time-window modifiers and conditional actions', () => {
    const rules: RuleComponentConfig[] = [
      {
        id: 'growth',
        version: 1,
        type: 'demandGrowth',
        ratePerDay: 0.1,
        maxMultiplier: 1.5
      },
      {
        id: 'evening-price',
        version: 1,
        type: 'timeWindowModifier',
        startHour: 17,
        endHour: 22,
        modifiers: { priceMultiplier: 1.25 }
      },
      {
        id: 'research-support',
        version: 1,
        type: 'conditionalAction',
        when: {
          mode: 'all',
          conditions: [
            { metric: 'satisfaction', operator: 'gte', target: 60, label: '满意度稳定' }
          ]
        },
        action: {
          type: 'adjustState',
          field: 'researchPoints',
          amountPerHour: 2
        }
      }
    ];
    const state = createState();
    state.day = 2;
    state.hour = 18;

    const result = new RuleEngine(rules).evaluate({ state, deltaHours: 3 });

    expect(result.modifiers.demandMultiplier).toBeCloseTo(1.175);
    expect(result.modifiers.priceMultiplier).toBeCloseTo(1.25);
    expect(result.stateDeltas.researchPoints).toBe(6);
    expect(result.signals).toContainEqual({
      ruleId: 'research-support',
      signal: 'action.researchPoints'
    });
  });

  it('does not execute disabled rules', () => {
    const rules: RuleComponentConfig[] = [
      {
        id: 'disabled-growth',
        version: 1,
        type: 'demandGrowth',
        enabled: false,
        ratePerDay: 5,
        maxMultiplier: 20
      }
    ];

    const result = new RuleEngine(rules).evaluate({ state: createState(), deltaHours: 1 });
    expect(result.modifiers.demandMultiplier).toBe(1);
  });

  it('clamps mutable state fields when applying deltas', () => {
    const state = createState();
    const engine = new RuleEngine([]);

    engine.applyStateDeltas(state, {
      money: -1500,
      population: -10000,
      satisfaction: 80,
      pollution: -50,
      researchPoints: -20
    });

    expect(state.money).toBe(-500);
    expect(state.population).toBe(0);
    expect(state.satisfaction).toBe(100);
    expect(state.pollution).toBe(0);
    expect(state.researchPoints).toBe(0);
  });
});
