import { describe, expect, it } from 'vitest';
import { gradeBattle } from './BattleCommercial';
import type { BattleSnapshot } from './types';

const victorySnapshot = (overrides: Partial<BattleSnapshot> = {}): BattleSnapshot => ({
  levelId: 'city01',
  status: 'victory',
  elapsedSeconds: 82,
  currentWaveIndex: 3,
  totalWaves: 3,
  nextWaveInSeconds: 0,
  totalSupplyMw: 180,
  totalDemandMw: 0,
  totalAllocatedMw: 0,
  batteryEnergyMwh: 28,
  batteryCapacityMwh: 80,
  criticalOutageSeconds: 0,
  criticalOutageLimitSeconds: 60,
  nodes: [],
  edges: [],
  monsters: [],
  message: 'victory',
  ...overrides
});

describe('gradeBattle', () => {
  it('awards three stars for a clean, efficient defense', () => {
    const grade = gradeBattle(victorySnapshot({ batteryEnergyMwh: 56 }), {
      peakCriticalOutageSeconds: 2,
      lineBreaks: 0,
      routeSwitches: 3,
      overloads: 5
    });

    expect(grade.stars).toBe(3);
    expect(grade.score).toBeGreaterThanOrEqual(80);
  });

  it('penalizes hospital outages, drained storage and broken lines', () => {
    const grade = gradeBattle(victorySnapshot({ elapsedSeconds: 112, batteryEnergyMwh: 6 }), {
      peakCriticalOutageSeconds: 38,
      lineBreaks: 2,
      routeSwitches: 1,
      overloads: 7
    });

    expect(grade.stars).toBe(1);
    expect(grade.score).toBeLessThan(58);
    expect(grade.recommendation.length).toBeGreaterThan(10);
  });

  it('returns zero stars after defeat with a useful recommendation', () => {
    const grade = gradeBattle(victorySnapshot({ status: 'defeat' }), {
      peakCriticalOutageSeconds: 60,
      lineBreaks: 0,
      routeSwitches: 0,
      overloads: 0
    });

    expect(grade.stars).toBe(0);
    expect(grade.score).toBe(0);
    expect(grade.recommendation).toContain('医院');
  });
});
