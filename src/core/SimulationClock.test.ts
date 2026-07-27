import { describe, expect, it } from 'vitest';
import { SimulationClock } from './SimulationClock';

describe('SimulationClock', () => {
  it('advances five game minutes per real second at 1x', () => {
    expect(SimulationClock.toDeltaHours(1, 1000)).toBeCloseTo(1 / 12);
  });

  it('keeps speed multipliers proportional', () => {
    expect(SimulationClock.toDeltaHours(2, 1000)).toBeCloseTo(1 / 6);
    expect(SimulationClock.toDeltaHours(4, 1000)).toBeCloseTo(1 / 3);
  });

  it('accounts for level tick intervals and pause', () => {
    expect(SimulationClock.toDeltaHours(1, 500)).toBeCloseTo(1 / 24);
    expect(SimulationClock.toDeltaHours(0, 1000)).toBe(0);
  });
});
