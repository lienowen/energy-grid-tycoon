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

  it('does not waste storage energy when no monster is on the selected line', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();
    const before = engine.snapshot().batteryEnergyMwh;

    const result = engine.forceOverload('spawn-east-edge');
    const after = engine.snapshot();

    expect(result.ok).toBe(false);
    expect(after.batteryEnergyMwh).toBe(before);
    expect(result.message).toContain('没有噬电兽');
  });

  it('consumes storage energy when a monster is on the forced-overload line', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();
    advance(engine, 3.1);
    const before = engine.snapshot().batteryEnergyMwh;

    const result = engine.forceOverload('spawn-east-edge');
    const after = engine.snapshot();

    expect(result.ok).toBe(true);
    expect(after.batteryEnergyMwh).toBeLessThan(before);
    expect(after.edges.find((edge) => edge.id === 'spawn-east-edge')?.loadState).toBe('overload');
    expect(result.message).toContain('命中 1 只');
  });

  it('keeps a defeated monster on its edge long enough for the death presentation', () => {
    const presentationLevel = {
      ...CITY01_SIEGE_LEVEL,
      monsters: CITY01_SIEGE_LEVEL.monsters.map((monster) => (
        monster.id === 'crawler' ? { ...monster, maxHp: 8 } : { ...monster }
      ))
    };
    const engine = new BattleEngine(presentationLevel);
    engine.start();
    advance(engine, 3.1);

    const result = engine.forceOverload('spawn-east-edge');
    expect(result.ok).toBe(true);
    advance(engine, 0.2);

    const defeated = engine.snapshot().monsters.find((monster) => monster.archetypeId === 'crawler');
    expect(defeated?.alive).toBe(false);
    expect(defeated?.defeatedAtSeconds).toBeDefined();
    expect(defeated?.currentEdgeId).toBe('spawn-east-edge');
    expect(defeated?.nextNodeId).toBe('east-junction');
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
