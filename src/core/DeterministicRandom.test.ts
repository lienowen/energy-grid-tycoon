import { describe, expect, it } from 'vitest';
import { DeterministicRandom, hashSeed } from './DeterministicRandom';

describe('DeterministicRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const first = new DeterministicRandom(123456);
    const second = new DeterministicRandom(123456);

    const sequenceA = Array.from({ length: 12 }, () => first.next());
    const sequenceB = Array.from({ length: 12 }, () => second.next());

    expect(sequenceA).toEqual(sequenceB);
  });

  it('continues exactly from a persisted state', () => {
    const source = DeterministicRandom.fromText('city-03:campaign');
    source.next();
    source.next();
    const savedState = source.getState();
    const expectedContinuation = Array.from({ length: 8 }, () => source.next());

    const restored = new DeterministicRandom(savedState);
    const restoredContinuation = Array.from({ length: 8 }, () => restored.next());

    expect(restoredContinuation).toEqual(expectedContinuation);
  });

  it('hashes text seeds consistently and never returns zero', () => {
    expect(hashSeed('energy-grid')).toBe(hashSeed('energy-grid'));
    expect(hashSeed('energy-grid')).not.toBe(hashSeed('energy-grid-2'));
    expect(hashSeed('')).toBeGreaterThan(0);
  });
});
