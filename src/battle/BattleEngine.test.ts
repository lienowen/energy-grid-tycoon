import { describe, expect, it } from 'vitest';
import { BattleEngine } from './BattleEngine';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';

const advance = (engine: BattleEngine, seconds: number): void => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) engine.tick(0.1);
};

describe('BattleEngine', () => {
  it('spawns the first wave and exposes live power state', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();
    advance(engine, 8);

    const snapshot = engine.snapshot();
    expect(snapshot.status).toBe('running');
    expect(snapshot.currentWaveIndex).toBe(1);
    expect(snapshot.monsters.length).toBeGreaterThan(0);
    expect(snapshot.totalAllocatedMw).toBeGreaterThan(0);
  });

  it('consumes storage energy when a line is forced into overload', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();
    const before = engine.snapshot().batteryEnergyMwh;

    const result = engine.forceOverload('spawn-east-edge');
    const after = engine.snapshot();

    expect(result.ok).toBe(true);
    expect(after.batteryEnergyMwh).toBeLessThan(before);
    expect(after.edges.find((edge) => edge.id === 'spawn-east-edge')?.loadState).toBe('overload');
  });

  it('eventually loses when monsters drain the hospital', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();
    advance(engine, 170);

    const snapshot = engine.snapshot();
    expect(snapshot.status).toBe('defeat');
    expect(snapshot.criticalOutageSeconds).toBeGreaterThanOrEqual(snapshot.criticalOutageLimitSeconds);
  });
});
