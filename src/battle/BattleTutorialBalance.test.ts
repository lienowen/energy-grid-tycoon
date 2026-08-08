import { describe, expect, it } from 'vitest';
import { BattleEngine } from './BattleEngine';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';

const advance = (engine: BattleEngine, seconds: number): void => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) engine.tick(0.1);
};

describe('City-01 commercial tutorial balance', () => {
  it('lets the guided first overload visibly eliminate multiple crawlers', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();

    expect(engine.switchRoute('battery-industrial').ok).toBe(true);
    advance(engine, 3.1);
    expect(engine.forceOverload('spawn-east-edge').ok).toBe(true);
    advance(engine, 3.1);

    const crawlers = engine.snapshot().monsters.filter((monster) => monster.archetypeId === 'crawler');
    const defeated = crawlers.filter((monster) => !monster.alive);
    expect(defeated.length).toBeGreaterThanOrEqual(2);
    expect(defeated.every((monster) => monster.defeatedAtSeconds !== undefined)).toBe(true);
  });

  it('keeps first-wave spacing inside the overload window so the group-hit lesson is physically possible', () => {
    const firstSpawn = CITY01_SIEGE_LEVEL.waves[0]?.spawns[0];
    expect(firstSpawn).toBeDefined();
    expect(firstSpawn?.intervalSeconds).toBeLessThan(CITY01_SIEGE_LEVEL.overloadDurationSeconds);
  });

  it('gives a first-time player enough storage margin to learn before the boss', () => {
    const battery = CITY01_SIEGE_LEVEL.nodes.find((node) => node.kind === 'battery');
    expect(battery?.batteryInitialMwh).toBeGreaterThanOrEqual(CITY01_SIEGE_LEVEL.overloadEnergyCostMwh * 9);
  });

  it('keeps the boss durable without turning it into a five-cast energy tax', () => {
    const boss = CITY01_SIEGE_LEVEL.monsters.find((monster) => monster.id === 'boss');
    if (!boss) throw new Error('Missing City-01 boss');

    const damagePerFullOverload = CITY01_SIEGE_LEVEL.overloadDamagePerSecond
      * CITY01_SIEGE_LEVEL.overloadDurationSeconds
      * (boss.overloadDamageMultiplier ?? 1);
    const fullOverloadsToKill = Math.ceil(boss.maxHp / damagePerFullOverload);

    expect(fullOverloadsToKill).toBe(4);
  });
});
