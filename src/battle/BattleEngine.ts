import { edgeBetween, findShortestPath } from './GraphPathfinder';
import { allocatePower } from './PowerAllocator';
import type {
  BattleActionResult,
  BattleLevelConfig,
  BattleSnapshot,
  BattleStatus,
  EdgeRuntimeState,
  MonsterArchetype,
  MonsterRuntimeState,
  NodeRuntimeState,
  PowerEdgeConfig,
  PowerEdgeId,
  PowerNodeConfig,
  PowerNodeId,
  WaveSpawnConfig
} from './types';

interface ScheduledSpawn {
  spawnAtSeconds: number;
  waveIndex: number;
  spawn: WaveSpawnConfig;
  consumed: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const MONSTER_DEATH_PRESENTATION_SECONDS = 0.9;
const BOSS_ROAR_PRESENTATION_SECONDS = 1.2;

export class BattleEngine {
  private readonly nodeById: Map<PowerNodeId, PowerNodeConfig>;
  private readonly edgeById: Map<PowerEdgeId, PowerEdgeConfig>;
  private readonly monsterById: Map<string, MonsterArchetype>;
  private readonly nodeRuntimeById = new Map<PowerNodeId, NodeRuntimeState>();
  private readonly edgeRuntimeById = new Map<PowerEdgeId, EdgeRuntimeState>();
  private readonly monsters = new Map<string, MonsterRuntimeState>();
  private readonly scheduledSpawns: ScheduledSpawn[];
  private status: BattleStatus = 'ready';
  private elapsedSeconds = 0;
  private monsterSequence = 0;
  private message = '准备迎击噬电兽。';

  constructor(private readonly level: BattleLevelConfig) {
    this.nodeById = new Map(level.nodes.map((node) => [node.id, node] as const));
    this.edgeById = new Map(level.edges.map((edge) => [edge.id, edge] as const));
    this.monsterById = new Map(level.monsters.map((monster) => [monster.id, monster] as const));

    for (const node of level.nodes) {
      this.nodeRuntimeById.set(node.id, {
        id: node.id,
        operatingState: 'online',
        requestedMw: node.demandMw ?? 0,
        allocatedMw: 0,
        powerPercent: (node.demandMw ?? 0) > 0 ? 0 : 100,
        outageSeconds: 0,
        batteryEnergyMwh: node.batteryInitialMwh ?? 0
      });
    }
    for (const edge of level.edges) {
      this.edgeRuntimeById.set(edge.id, {
        id: edge.id,
        operatingState: 'online',
        loadMw: 0,
        loadPercent: 0,
        loadState: 'normal',
        overloadRemainingSeconds: 0,
        overloadCooldownRemainingSeconds: 0,
        heatPercent: 0,
        repairRemainingSeconds: 0,
        bossLockRemainingSeconds: 0
      });
    }

    this.scheduledSpawns = level.waves.flatMap((wave, waveIndex) => wave.spawns.flatMap((spawn) => (
      Array.from({ length: spawn.count }, (_, sequence): ScheduledSpawn => ({
        spawnAtSeconds: wave.startsAtSeconds + (spawn.initialDelaySeconds ?? 0) + sequence * spawn.intervalSeconds,
        waveIndex,
        spawn,
        consumed: false
      }))
    ))).sort((a, b) => a.spawnAtSeconds - b.spawnAtSeconds);

    this.recalculatePower(0);
  }

  start(): void {
    if (this.status === 'ready' || this.status === 'paused') {
      this.status = 'running';
      this.message = '电网已接管，第一波正在接近。';
    }
  }

  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.message = '战斗已暂停。';
    } else if (this.status === 'paused') {
      this.status = 'running';
      this.message = '战斗继续。';
    }
  }

  restart(): void {
    const fresh = new BattleEngine(this.level);
    this.status = fresh.status;
    this.elapsedSeconds = fresh.elapsedSeconds;
    this.monsterSequence = fresh.monsterSequence;
    this.message = fresh.message;
    this.nodeRuntimeById.clear();
    fresh.nodeRuntimeById.forEach((value, key) => this.nodeRuntimeById.set(key, { ...value }));
    this.edgeRuntimeById.clear();
    fresh.edgeRuntimeById.forEach((value, key) => this.edgeRuntimeById.set(key, { ...value }));
    this.monsters.clear();
    this.scheduledSpawns.forEach((spawn, index) => {
      const next = fresh.scheduledSpawns[index];
      spawn.consumed = next?.consumed ?? false;
    });
    this.start();
  }

  tick(deltaSeconds: number): void {
    if (this.status !== 'running') return;
    const delta = clamp(deltaSeconds, 0, 0.1);
    if (delta <= 0) return;

    this.elapsedSeconds += delta;
    this.spawnDueMonsters();
    this.updateBossRouteLocks(delta);
    this.updateOverloads(delta);
    this.updateMonsters(delta);
    this.updateBossAbilities(delta);
    this.recalculatePower(delta);
    this.updateCriticalState(delta);
    this.updateOutcome();
  }

  toggleZone(nodeId: PowerNodeId): BattleActionResult {
    if (this.status === 'victory' || this.status === 'defeat') {
      return { ok: false, message: '本局已经结束。' };
    }
    const config = this.nodeById.get(nodeId);
    const runtime = this.nodeRuntimeById.get(nodeId);
    if (!config || !runtime) return { ok: false, message: '没有找到该区域。' };
    if (config.lockedOnline || config.kind === 'hospital' || config.kind === 'junction') {
      return { ok: false, message: `${config.label}不能关闭。` };
    }
    runtime.operatingState = runtime.operatingState === 'online' ? 'offline' : 'online';
    if (runtime.operatingState === 'offline') {
      runtime.allocatedMw = 0;
      runtime.powerPercent = 0;
    }
    this.recalculatePathsAtNodes();
    this.recalculatePower(0);
    this.message = runtime.operatingState === 'online'
      ? `${config.label}重新供电，怪物路线已更新。`
      : `${config.label}已关闭，怪物将寻找新的带电路径。`;
    return { ok: true, message: this.message };
  }

  switchRoute(edgeId: PowerEdgeId): BattleActionResult {
    const config = this.edgeById.get(edgeId);
    const runtime = this.edgeRuntimeById.get(edgeId);
    if (!config || !runtime) return { ok: false, message: '没有找到该线路。' };
    if (runtime.bossLockRemainingSeconds > 0) {
      return { ok: false, message: `兽王干扰中，该线路还被锁定 ${Math.ceil(runtime.bossLockRemainingSeconds)} 秒。` };
    }
    if (config.switchable === false || runtime.operatingState === 'broken') {
      return { ok: false, message: runtime.operatingState === 'broken' ? '线路已损坏，等待自动修复。' : '该线路不能切换。' };
    }
    runtime.operatingState = runtime.operatingState === 'online' ? 'offline' : 'online';
    runtime.overloadRemainingSeconds = 0;
    this.recalculatePathsAtNodes();
    this.recalculatePower(0);
    this.message = runtime.operatingState === 'online'
      ? '线路已接通，供电潮流和怪物路线已更新。'
      : '线路已断开，供电潮流和怪物路线正在重新计算。';
    return { ok: true, message: this.message };
  }

  forceOverload(edgeId: PowerEdgeId): BattleActionResult {
    const config = this.edgeById.get(edgeId);
    const runtime = this.edgeRuntimeById.get(edgeId);
    if (!config || !runtime) return { ok: false, message: '没有找到该线路。' };
    if (runtime.operatingState === 'broken') {
      return { ok: false, message: `线路损坏，${Math.ceil(runtime.repairRemainingSeconds)} 秒后修复。` };
    }
    if (runtime.operatingState !== 'online') return { ok: false, message: '断开的线路不能过载。' };
    if (runtime.overloadRemainingSeconds > 0) return { ok: false, message: '该线路正在过载。' };
    if (runtime.overloadCooldownRemainingSeconds > 0) {
      return { ok: false, message: `线路冷却中，还需 ${Math.ceil(runtime.overloadCooldownRemainingSeconds)} 秒。` };
    }

    const targetMonsters = [...this.monsters.values()].filter((monster) => (
      monster.alive && monster.currentEdgeId === edgeId
    ));
    if (targetMonsters.length === 0) {
      return { ok: false, message: '当前线路没有噬电兽，等怪物进入线路后再过载。' };
    }

    const batteries = this.level.nodes.filter((node) => (node.batteryCapacityMwh ?? 0) > 0);
    const availableEnergy = batteries.reduce((sum, node) => (
      sum + (this.nodeRuntimeById.get(node.id)?.batteryEnergyMwh ?? 0)
    ), 0);
    if (availableEnergy < this.level.overloadEnergyCostMwh) {
      return { ok: false, message: '储能不足，无法强制过载。' };
    }

    let remainingCost = this.level.overloadEnergyCostMwh;
    for (const battery of batteries) {
      const state = this.nodeRuntimeById.get(battery.id);
      if (!state || remainingCost <= 0) continue;
      const consumed = Math.min(state.batteryEnergyMwh, remainingCost);
      state.batteryEnergyMwh -= consumed;
      remainingCost -= consumed;
    }

    runtime.overloadRemainingSeconds = this.level.overloadDurationSeconds;
    runtime.overloadCooldownRemainingSeconds = this.level.overloadCooldownSeconds;
    runtime.heatPercent = clamp(runtime.heatPercent + this.level.overloadHeatGainPercent, 0, 150);
    runtime.loadState = 'overload';
    const heatWarning = runtime.heatPercent >= 100
      ? ' 线路已进入熔断危险！'
      : runtime.heatPercent >= 75 ? ' 线路温度过高。' : '';
    this.message = `线路强制过载：命中 ${targetMonsters.length} 只噬电兽！${heatWarning}`;
    return { ok: true, message: this.message };
  }

  snapshot(): BattleSnapshot {
    const critical = this.level.nodes.find((node) => node.kind === 'hospital');
    const criticalRuntime = critical ? this.nodeRuntimeById.get(critical.id) : undefined;
    const batteryNodes = this.level.nodes.filter((node) => (node.batteryCapacityMwh ?? 0) > 0);
    const batteryCapacityMwh = batteryNodes.reduce((sum, node) => sum + (node.batteryCapacityMwh ?? 0), 0);
    const batteryEnergyMwh = batteryNodes.reduce((sum, node) => (
      sum + (this.nodeRuntimeById.get(node.id)?.batteryEnergyMwh ?? 0)
    ), 0);
    const totalSupplyMw = this.level.nodes.reduce((sum, node) => (
      sum + (this.nodeRuntimeById.get(node.id)?.operatingState === 'online' ? (node.supplyMw ?? 0) : 0)
    ), 0);
    const totalDemandMw = [...this.nodeRuntimeById.values()].reduce((sum, node) => sum + node.requestedMw, 0);
    const totalAllocatedMw = [...this.nodeRuntimeById.values()].reduce((sum, node) => sum + node.allocatedMw, 0);
    const nextWave = this.level.waves.find((wave) => wave.startsAtSeconds > this.elapsedSeconds);

    return {
      levelId: this.level.id,
      status: this.status,
      elapsedSeconds: this.elapsedSeconds,
      currentWaveIndex: this.currentWaveIndex(),
      totalWaves: this.level.waves.length,
      nextWaveInSeconds: nextWave ? Math.max(0, nextWave.startsAtSeconds - this.elapsedSeconds) : 0,
      totalSupplyMw,
      totalDemandMw,
      totalAllocatedMw,
      batteryEnergyMwh,
      batteryCapacityMwh,
      criticalOutageSeconds: criticalRuntime?.outageSeconds ?? 0,
      criticalOutageLimitSeconds: critical?.criticalOutageLimitSeconds ?? 0,
      nodes: [...this.nodeRuntimeById.values()].map((node) => ({ ...node })),
      edges: [...this.edgeRuntimeById.values()].map((edge) => ({ ...edge })),
      monsters: [...this.monsters.values()].map((monster) => ({ ...monster, path: [...monster.path] })),
      message: this.message
    };
  }

  private spawnDueMonsters(): void {
    for (const scheduled of this.scheduledSpawns) {
      if (scheduled.consumed || scheduled.spawnAtSeconds > this.elapsedSeconds) continue;
      scheduled.consumed = true;
      const archetype = this.monsterById.get(scheduled.spawn.archetypeId);
      if (!archetype) continue;
      const id = `monster-${++this.monsterSequence}`;
      this.monsters.set(id, {
        id,
        archetypeId: archetype.id,
        hp: archetype.maxHp,
        maxHp: archetype.maxHp,
        spawnNodeId: scheduled.spawn.spawnNodeId,
        targetNodeId: scheduled.spawn.targetNodeId,
        currentNodeId: scheduled.spawn.spawnNodeId,
        progress: 0,
        path: this.pathFor(scheduled.spawn.spawnNodeId, scheduled.spawn.targetNodeId),
        reachedTarget: false,
        alive: true,
        abilityCooldownRemainingSeconds: archetype.id === 'boss' ? this.level.bossAbilityDelaySeconds : undefined
      });
      this.message = `${archetype.label}进入电网！`;
    }
  }

  private updateBossRouteLocks(deltaSeconds: number): void {
    for (const runtime of this.edgeRuntimeById.values()) {
      runtime.bossLockRemainingSeconds = Math.max(0, runtime.bossLockRemainingSeconds - deltaSeconds);
    }
  }

  private updateBossAbilities(deltaSeconds: number): void {
    for (const monster of this.monsters.values()) {
      if (!monster.alive || monster.reachedTarget || monster.archetypeId !== 'boss') continue;
      monster.abilityCooldownRemainingSeconds = Math.max(
        0,
        (monster.abilityCooldownRemainingSeconds ?? this.level.bossAbilityDelaySeconds) - deltaSeconds
      );
      if (monster.abilityCooldownRemainingSeconds > 0) continue;

      const targetEdge = this.bossLockTarget(monster);
      if (!targetEdge) {
        monster.abilityCooldownRemainingSeconds = 1;
        continue;
      }
      const runtime = this.edgeRuntimeById.get(targetEdge.id);
      if (!runtime) continue;

      runtime.bossLockRemainingSeconds = this.level.bossRouteLockSeconds;
      monster.abilityCooldownRemainingSeconds = this.level.bossAbilityCooldownSeconds;
      monster.abilityActiveUntilSeconds = this.elapsedSeconds + BOSS_ROAR_PRESENTATION_SECONDS;
      this.message = `兽王怒吼！${this.edgeLabel(targetEdge)}被锁定 ${Math.ceil(this.level.bossRouteLockSeconds)} 秒。`;
    }
  }

  private bossLockTarget(monster: MonsterRuntimeState): PowerEdgeConfig | undefined {
    for (let index = 0; index < monster.path.length - 1; index += 1) {
      const from = monster.path[index];
      const to = monster.path[index + 1];
      if (!from || !to) continue;
      const edge = edgeBetween(this.level.edges, from, to);
      const runtime = edge ? this.edgeRuntimeById.get(edge.id) : undefined;
      if (edge?.switchable === true && runtime && runtime.operatingState !== 'broken' && runtime.bossLockRemainingSeconds <= 0) {
        return edge;
      }
    }

    return this.level.edges
      .filter((edge) => {
        const runtime = this.edgeRuntimeById.get(edge.id);
        return edge.switchable === true
          && runtime?.operatingState !== 'broken'
          && (runtime?.bossLockRemainingSeconds ?? 0) <= 0;
      })
      .sort((a, b) => {
        const loadDelta = (this.edgeRuntimeById.get(b.id)?.loadPercent ?? 0) - (this.edgeRuntimeById.get(a.id)?.loadPercent ?? 0);
        return Math.abs(loadDelta) > 0.001 ? loadDelta : a.id.localeCompare(b.id);
      })[0];
  }

  private edgeLabel(edge: PowerEdgeConfig): string {
    const from = this.nodeById.get(edge.from)?.label ?? edge.from;
    const to = this.nodeById.get(edge.to)?.label ?? edge.to;
    return `${from}→${to}`;
  }

  private updateOverloads(deltaSeconds: number): void {
    let networkChanged = false;

    for (const runtime of this.edgeRuntimeById.values()) {
      runtime.overloadCooldownRemainingSeconds = Math.max(
        0,
        runtime.overloadCooldownRemainingSeconds - deltaSeconds
      );

      if (runtime.operatingState === 'broken') {
        runtime.repairRemainingSeconds = Math.max(0, runtime.repairRemainingSeconds - deltaSeconds);
        runtime.heatPercent = Math.max(0, runtime.heatPercent - this.level.lineHeatCoolPerSecond * deltaSeconds);
        if (runtime.repairRemainingSeconds <= 0) {
          runtime.operatingState = 'online';
          runtime.loadState = 'normal';
          runtime.heatPercent = Math.min(runtime.heatPercent, 35);
          networkChanged = true;
          this.message = '受损线路已自动修复并重新接入电网。';
        }
        continue;
      }

      if (runtime.overloadRemainingSeconds <= 0) {
        runtime.heatPercent = Math.max(0, runtime.heatPercent - this.level.lineHeatCoolPerSecond * deltaSeconds);
        continue;
      }

      runtime.overloadRemainingSeconds = Math.max(0, runtime.overloadRemainingSeconds - deltaSeconds);
      for (const monster of this.monsters.values()) {
        if (!monster.alive || monster.currentEdgeId !== runtime.id) continue;
        const archetype = this.monsterById.get(monster.archetypeId);
        monster.hp = Math.max(
          0,
          monster.hp - this.level.overloadDamagePerSecond * (archetype?.overloadDamageMultiplier ?? 1) * deltaSeconds
        );
        if (monster.hp <= 0) {
          monster.alive = false;
          monster.defeatedAtSeconds = this.elapsedSeconds;
          this.message = `${archetype?.label ?? '噬电兽'}被过载电流消灭。`;
        }
      }

      if (runtime.overloadRemainingSeconds <= 0 && runtime.heatPercent >= 100) {
        runtime.operatingState = 'broken';
        runtime.loadState = 'broken';
        runtime.loadMw = 0;
        runtime.loadPercent = 0;
        runtime.repairRemainingSeconds = this.level.lineRepairSeconds;
        networkChanged = true;
        this.message = `线路过热熔断！${Math.ceil(this.level.lineRepairSeconds)} 秒后自动修复。`;
      }
    }

    if (networkChanged) this.recalculatePathsAtNodes();
  }

  private updateMonsters(deltaSeconds: number): void {
    for (const monster of this.monsters.values()) {
      if (!monster.alive || monster.reachedTarget) continue;
      const archetype = this.monsterById.get(monster.archetypeId);
      if (!archetype) continue;

      if (!monster.currentEdgeId || !monster.nextNodeId) {
        if (monster.currentNodeId === monster.targetNodeId) {
          monster.reachedTarget = true;
          continue;
        }
        monster.path = this.pathFor(monster.currentNodeId, monster.targetNodeId);
        const nextNode = monster.path[1];
        if (!nextNode) continue;
        const edge = edgeBetween(this.level.edges, monster.currentNodeId, nextNode);
        if (!edge) continue;
        monster.nextNodeId = nextNode;
        monster.currentEdgeId = edge.id;
        monster.progress = 0;
      }

      const current = this.nodeById.get(monster.currentNodeId);
      const next = monster.nextNodeId ? this.nodeById.get(monster.nextNodeId) : undefined;
      if (!current || !next) continue;
      const distance = Math.max(1, Math.hypot(next.x - current.x, next.y - current.y));
      monster.progress += archetype.speed * deltaSeconds / distance;
      if (monster.progress < 1) continue;

      monster.currentNodeId = next.id;
      monster.currentEdgeId = undefined;
      monster.nextNodeId = undefined;
      monster.progress = 0;
      if (monster.currentNodeId === monster.targetNodeId) {
        monster.reachedTarget = true;
        this.message = `${archetype.label}已经抵达医院，正在吞噬电力！`;
      }
    }
  }

  private recalculatePower(deltaSeconds: number): void {
    const monsterDrainByNodeId = new Map<PowerNodeId, number>();
    for (const monster of this.monsters.values()) {
      if (!monster.alive) continue;
      const archetype = this.monsterById.get(monster.archetypeId);
      if (!archetype) continue;
      const drainNodeId = monster.reachedTarget ? monster.targetNodeId : (monster.nextNodeId ?? monster.currentNodeId);
      monsterDrainByNodeId.set(drainNodeId, (monsterDrainByNodeId.get(drainNodeId) ?? 0) + archetype.drainMw);
    }

    const allocation = allocatePower({
      nodes: this.level.nodes,
      edges: this.level.edges,
      runtimeByNodeId: this.nodeRuntimeById,
      edgeRuntimeById: this.edgeRuntimeById,
      deltaSeconds,
      monsterDrainByNodeId
    });

    const batteryNodes = this.level.nodes.filter((node) => (node.batteryCapacityMwh ?? 0) > 0);
    let batteryRemaining = allocation.batteryEnergyMwh;
    for (const battery of batteryNodes) {
      const runtime = this.nodeRuntimeById.get(battery.id);
      if (!runtime) continue;
      const capacity = battery.batteryCapacityMwh ?? 0;
      runtime.batteryEnergyMwh = Math.min(capacity, batteryRemaining);
      batteryRemaining -= runtime.batteryEnergyMwh;
    }

    for (const node of this.level.nodes) {
      const runtime = this.nodeRuntimeById.get(node.id);
      if (!runtime) continue;
      const baseDemand = node.demandMw ?? 0;
      const monsterDrain = monsterDrainByNodeId.get(node.id) ?? 0;
      runtime.requestedMw = runtime.operatingState === 'online' ? baseDemand + monsterDrain : 0;
      runtime.allocatedMw = allocation.allocationByNodeId.get(node.id) ?? 0;
      runtime.powerPercent = baseDemand > 0
        ? clamp(runtime.allocatedMw / Math.max(1, baseDemand + monsterDrain) * 100, 0, 100)
        : 100;
    }

    this.updateEdgeLoads(allocation.flowByEdgeId);
  }

  private updateEdgeLoads(flowByEdgeId: ReadonlyMap<PowerEdgeId, number>): void {
    for (const edge of this.level.edges) {
      const runtime = this.edgeRuntimeById.get(edge.id);
      if (!runtime) continue;
      if (runtime.operatingState === 'broken') {
        runtime.loadMw = 0;
        runtime.loadPercent = 0;
        runtime.loadState = 'broken';
        continue;
      }
      if (runtime.operatingState === 'offline') {
        runtime.loadMw = 0;
        runtime.loadPercent = 0;
        runtime.loadState = 'normal';
        continue;
      }

      runtime.loadMw = Math.max(0, flowByEdgeId.get(edge.id) ?? 0);
      runtime.loadPercent = edge.capacityMw > 0 ? runtime.loadMw / edge.capacityMw * 100 : 0;
      if (runtime.overloadRemainingSeconds > 0) runtime.loadState = 'overload';
      else if (runtime.heatPercent >= 75 || runtime.loadPercent >= 80) runtime.loadState = 'high';
      else runtime.loadState = 'normal';
    }
  }

  private updateCriticalState(deltaSeconds: number): void {
    const critical = this.level.nodes.find((node) => node.kind === 'hospital');
    if (!critical) return;
    const runtime = this.nodeRuntimeById.get(critical.id);
    if (!runtime) return;
    const powered = runtime.operatingState === 'online' && runtime.powerPercent >= 98;
    runtime.outageSeconds = powered
      ? Math.max(0, runtime.outageSeconds - deltaSeconds * 0.65)
      : runtime.outageSeconds + deltaSeconds;
  }

  private updateOutcome(): void {
    const critical = this.level.nodes.find((node) => node.kind === 'hospital');
    const criticalRuntime = critical ? this.nodeRuntimeById.get(critical.id) : undefined;
    if (
      critical
      && criticalRuntime
      && criticalRuntime.outageSeconds >= (critical.criticalOutageLimitSeconds ?? Number.POSITIVE_INFINITY)
    ) {
      this.status = 'defeat';
      this.message = '医院断电时间超过限制，城市防线失守。';
      return;
    }

    const allSpawned = this.scheduledSpawns.every((spawn) => spawn.consumed);
    const livingMonsters = [...this.monsters.values()].some((monster) => monster.alive);
    const deathPresentationRunning = [...this.monsters.values()].some((monster) => (
      !monster.alive
      && monster.defeatedAtSeconds !== undefined
      && this.elapsedSeconds - monster.defeatedAtSeconds < MONSTER_DEATH_PRESENTATION_SECONDS
    ));
    if (allSpawned && !livingMonsters && !deathPresentationRunning) {
      this.status = 'victory';
      this.message = '所有噬电兽已清除，城市供电恢复稳定！';
    }
  }

  private currentWaveIndex(): number {
    let index = 0;
    for (let waveIndex = 0; waveIndex < this.level.waves.length; waveIndex += 1) {
      const wave = this.level.waves[waveIndex];
      if (wave && wave.startsAtSeconds <= this.elapsedSeconds) index = waveIndex + 1;
    }
    return index;
  }

  private recalculatePathsAtNodes(): void {
    for (const monster of this.monsters.values()) {
      if (!monster.alive || monster.reachedTarget || monster.currentEdgeId) continue;
      monster.path = this.pathFor(monster.currentNodeId, monster.targetNodeId);
    }
  }

  private pathFor(startNodeId: PowerNodeId, targetNodeId: PowerNodeId): PowerNodeId[] {
    const blockedNodes = new Set(
      this.level.nodes
        .filter((node) => this.nodeRuntimeById.get(node.id)?.operatingState === 'offline')
        .map((node) => node.id)
    );
    return findShortestPath(
      this.level.nodes,
      this.level.edges,
      this.edgeRuntimeById,
      startNodeId,
      targetNodeId,
      { blockedNodeIds: blockedNodes }
    );
  }
}
