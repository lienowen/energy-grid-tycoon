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
    expect(after.edges.find((edge) => edge.id === 'spawn-east-edge')?.heatPercent).toBe(60);
    expect(result.message).toContain('命中 1 只');
  });

  it('blocks overload spam during cooldown without spending more storage', () => {
    const durableLevel = {
      ...CITY01_SIEGE_LEVEL,
      monsters: CITY01_SIEGE_LEVEL.monsters.map((monster) => (
        monster.id === 'crawler' ? { ...monster, maxHp: 10_000, speed: 0 } : { ...monster }
      ))
    };
    const engine = new BattleEngine(durableLevel);
    engine.start();
    advance(engine, 3.1);

    expect(engine.forceOverload('spawn-east-edge').ok).toBe(true);
    advance(engine, durableLevel.overloadDurationSeconds + 0.1);
    const beforeBlocked = engine.snapshot().batteryEnergyMwh;
    const blocked = engine.forceOverload('spawn-east-edge');

    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain('冷却');
    expect(engine.snapshot().batteryEnergyMwh).toBe(beforeBlocked);
  });

  it('breaks an overheated line after repeated overloads and repairs it automatically', () => {
    const durableLevel = {
      ...CITY01_SIEGE_LEVEL,
      monsters: CITY01_SIEGE_LEVEL.monsters.map((monster) => (
        monster.id === 'crawler' ? { ...monster, maxHp: 10_000, speed: 0 } : { ...monster }
      ))
    };
    const engine = new BattleEngine(durableLevel);
    engine.start();
    advance(engine, 3.1);

    expect(engine.forceOverload('spawn-east-edge').ok).toBe(true);
    advance(engine, durableLevel.overloadCooldownSeconds + 0.1);
    expect(engine.forceOverload('spawn-east-edge').ok).toBe(true);
    advance(engine, durableLevel.overloadCooldownSeconds + 0.1);
    expect(engine.forceOverload('spawn-east-edge').ok).toBe(true);
    advance(engine, durableLevel.overloadDurationSeconds + 0.2);

    const broken = engine.snapshot().edges.find((edge) => edge.id === 'spawn-east-edge');
    expect(broken?.operatingState).toBe('broken');
    expect(broken?.loadState).toBe('broken');
    expect(broken?.repairRemainingSeconds).toBeGreaterThan(0);

    advance(engine, durableLevel.lineRepairSeconds + 0.2);
    const repaired = engine.snapshot().edges.find((edge) => edge.id === 'spawn-east-edge');
    expect(repaired?.operatingState).toBe('online');
    expect(repaired?.repairRemainingSeconds).toBe(0);
    expect(repaired?.heatPercent).toBeLessThanOrEqual(35);
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

  it('lets the boss temporarily lock a switchable route on its current path', () => {
    const bossLevel = {
      ...CITY01_SIEGE_LEVEL,
      bossAbilityDelaySeconds: 0.2,
      bossAbilityCooldownSeconds: 99,
      bossRouteLockSeconds: 2,
      monsters: CITY01_SIEGE_LEVEL.monsters.map((monster) => (
        monster.id === 'boss' ? { ...monster, speed: 0 } : { ...monster }
      )),
      waves: [{
        id: 'boss-test',
        label: 'Boss Test',
        startsAtSeconds: 0,
        spawns: [{
          archetypeId: 'boss',
          count: 1,
          intervalSeconds: 1,
          spawnNodeId: 'spawn-east',
          targetNodeId: 'hospital'
        }]
      }]
    };
    const engine = new BattleEngine(bossLevel);
    engine.start();
    advance(engine, 0.4);

    const locked = engine.snapshot().edges.find((edge) => edge.bossLockRemainingSeconds > 0);
    expect(locked).toBeDefined();
    expect(locked?.id).toBe('battery-industrial');
    expect(engine.snapshot().monsters[0]?.abilityActiveUntilSeconds).toBeGreaterThan(engine.snapshot().elapsedSeconds);

    const blockedSwitch = engine.switchRoute(locked!.id);
    expect(blockedSwitch.ok).toBe(false);
    expect(blockedSwitch.message).toContain('兽王');

    advance(engine, bossLevel.bossRouteLockSeconds + 0.2);
    expect(engine.snapshot().edges.find((edge) => edge.id === locked!.id)?.bossLockRemainingSeconds).toBe(0);
    expect(engine.switchRoute(locked!.id).ok).toBe(true);
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
