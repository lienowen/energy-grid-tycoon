import { describe, expect, it } from 'vitest';
import { BattleEngine } from './BattleEngine';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';
import type { BattleSnapshot, MonsterRuntimeState } from './types';

const remainingPathHops = (monster: MonsterRuntimeState): number => {
  const index = monster.path.indexOf(monster.currentNodeId);
  if (index < 0) return monster.path.length;
  return Math.max(0, monster.path.length - index - 1);
};

const monstersOnEdge = (snapshot: BattleSnapshot, edgeId: string): MonsterRuntimeState[] =>
  snapshot.monsters.filter((monster) => monster.alive && monster.currentEdgeId === edgeId);

const chooseOverloadEdge = (snapshot: BattleSnapshot): string | undefined => {
  const edgeState = new Map(snapshot.edges.map((edge) => [edge.id, edge] as const));
  const groups = new Map<string, MonsterRuntimeState[]>();

  for (const monster of snapshot.monsters) {
    if (!monster.alive || !monster.currentEdgeId) continue;
    const group = groups.get(monster.currentEdgeId) ?? [];
    group.push(monster);
    groups.set(monster.currentEdgeId, group);
  }

  const candidates = [...groups.entries()].filter(([edgeId]) => {
    const edge = edgeState.get(edgeId);
    return edge
      && edge.operatingState === 'online'
      && edge.overloadRemainingSeconds <= 0
      && edge.overloadCooldownRemainingSeconds <= 0;
  });

  candidates.sort(([, a], [, b]) => {
    const score = (group: MonsterRuntimeState[]): number => group.reduce((total, monster) => {
      const bossBonus = monster.archetypeId === 'boss' ? 120 : 0;
      const bruteBonus = monster.archetypeId === 'brute' ? 18 : 0;
      const dangerBonus = remainingPathHops(monster) <= 2 ? 22 : 0;
      const woundedBonus = monster.hp < monster.maxHp * 0.78 ? 12 : 0;
      return total + 20 + bossBonus + bruteBonus + dangerBonus + woundedBonus;
    }, 0);
    return score(b) - score(a);
  });

  for (const [edgeId, group] of candidates) {
    const hasBoss = group.some((monster) => monster.archetypeId === 'boss');
    const hasWoundedBrute = group.some((monster) => monster.archetypeId === 'brute' && monster.hp < monster.maxHp);
    const imminent = group.some((monster) => remainingPathHops(monster) <= 2);
    if (group.length >= 2 || hasBoss || hasWoundedBrute || imminent) return edgeId;
  }

  return undefined;
};

describe('City-01 strategic commercial playtest', () => {
  it('clears with the taught strategy inside the commercial time, safety, and energy margins', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();
    expect(engine.switchRoute('battery-industrial').ok).toBe(true);

    let restoredTutorialRoute = false;
    let overloads = 0;
    let peakOutage = 0;
    let bossSeen = false;
    const castLog: Array<Record<string, unknown>> = [];

    for (let elapsed = 0; elapsed < 155 && engine.snapshot().status === 'running'; elapsed += 0.1) {
      engine.tick(0.1);
      let snapshot = engine.snapshot();
      peakOutage = Math.max(peakOutage, snapshot.criticalOutageSeconds);
      bossSeen ||= snapshot.monsters.some((monster) => monster.alive && monster.archetypeId === 'boss');

      if (!restoredTutorialRoute && snapshot.elapsedSeconds >= 6.4) {
        expect(engine.switchRoute('battery-industrial').ok).toBe(true);
        restoredTutorialRoute = true;
        snapshot = engine.snapshot();
      }

      if (snapshot.batteryEnergyMwh < CITY01_SIEGE_LEVEL.overloadEnergyCostMwh) continue;
      const edgeId = chooseOverloadEdge(snapshot);
      if (!edgeId) continue;

      const targets = monstersOnEdge(snapshot, edgeId).map((monster) => ({
        type: monster.archetypeId,
        hp: Math.round(monster.hp),
        hops: remainingPathHops(monster)
      }));
      const batteryBefore = snapshot.batteryEnergyMwh;
      const result = engine.forceOverload(edgeId);
      if (!result.ok) continue;

      overloads += 1;
      castLog.push({
        t: Number(snapshot.elapsedSeconds.toFixed(1)),
        edge: edgeId,
        batteryBefore: Number(batteryBefore.toFixed(1)),
        targets
      });
    }

    const final = engine.snapshot();
    const reached = final.monsters.filter((monster) => monster.reachedTarget && monster.alive);
    const alive = final.monsters.filter((monster) => monster.alive);
    const metrics = {
      status: final.status,
      elapsedSeconds: Number(final.elapsedSeconds.toFixed(1)),
      peakOutage: Number(peakOutage.toFixed(1)),
      batteryEnergyMwh: Number(final.batteryEnergyMwh.toFixed(1)),
      overloads,
      bossSeen,
      castLog,
      reachedTarget: reached.map((monster) => ({ type: monster.archetypeId, hp: Math.round(monster.hp) })),
      alive: alive.map((monster) => ({
        type: monster.archetypeId,
        hp: Math.round(monster.hp),
        reachedTarget: monster.reachedTarget,
        edge: monster.currentEdgeId ?? null
      }))
    };
    console.info('CITY01_STRATEGIC_PLAYTEST', JSON.stringify(metrics));

    expect(bossSeen).toBe(true);
    expect(final.status).toBe('victory');
    expect(final.elapsedSeconds).toBeLessThan(110);
    expect(peakOutage).toBeLessThan(15);
    expect(overloads).toBeLessThanOrEqual(12);
    expect(final.batteryEnergyMwh).toBeGreaterThanOrEqual(8);
  });
});
