import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/GameState';
import { LevelLoader, type LevelConfig } from './LevelLoader';

const level: LevelConfig = {
  schemaVersion: 1,
  id: 'seed-city',
  name: '种子城',
  description: '验证可复现城市状态。',
  progression: {
    requirementMode: 'all',
    requiresCompletedLevelIds: []
  },
  initial: {
    money: 1000,
    population: 2000,
    baseDemand: 300,
    powerPrice: 0.4,
    satisfaction: 80,
    researchPoints: 0,
    technologies: [],
    buildings: []
  },
  catalog: {
    buildings: [],
    events: [],
    technologies: [],
    policies: []
  },
  rules: {
    schemaVersion: 1,
    seed: 24680,
    tickIntervalMs: 1000,
    eventTriggerChance: 0,
    powerPriceRange: { min: 0.2, max: 0.8 },
    components: [],
    objective: {
      label: '维持城市运行',
      mode: 'all',
      conditions: []
    },
    failure: {
      label: '城市无法运行',
      mode: 'any',
      conditions: []
    }
  }
};

describe('LevelLoader deterministic state', () => {
  it('initializes runtime random state from the configured level seed', () => {
    const loaded = LevelLoader.load(level, []);

    expect(loaded.state.randomState).toBe(level.rules.seed);
  });

  it('restores the saved runtime random state instead of restarting the sequence', () => {
    const loaded = LevelLoader.load(level, []);
    const savedState: GameState = {
      ...loaded.state,
      levelId: 'stale-id',
      cityName: '旧城市名',
      randomState: 987654321
    };

    const restored = LevelLoader.restore(level, [], savedState, []);

    expect(restored.state.levelId).toBe(level.id);
    expect(restored.state.cityName).toBe(level.name);
    expect(restored.state.randomState).toBe(987654321);
  });

  it('falls back to the configured seed when migrating a legacy save without random state', () => {
    const loaded = LevelLoader.load(level, []);
    const legacyState = {
      ...loaded.state,
      randomState: undefined
    } as unknown as GameState;

    const restored = LevelLoader.restore(level, [], legacyState, []);

    expect(restored.state.randomState).toBe(level.rules.seed);
  });
});
