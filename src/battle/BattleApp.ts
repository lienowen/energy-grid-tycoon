import {
  BATTLE_ASSET_URLS,
  BATTLE_UI_ASSETS,
  batteryDischargeEffectUrl,
  edgeOverlayFor,
  facilitySpriteFor,
  monsterDeathEffectUrl,
  monsterSpriteFor,
  overloadNodeSpriteUrl,
  type MonsterVisualState
} from './BattleAssetCatalog';
import { BattleAudio } from './BattleAudio';
import { gradeBattle } from './BattleCommercial';
import { BattleEngine } from './BattleEngine';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';
import type {
  BattleSnapshot,
  EdgeRuntimeState,
  MonsterRuntimeState,
  NodeRuntimeState,
  PowerNodeConfig
} from './types';
import './battle.css';
import './battle-assets.css';

const level = CITY01_SIEGE_LEVEL;
const nodeById = new Map(level.nodes.map((node) => [node.id, node] as const));
const edgeById = new Map(level.edges.map((edge) => [edge.id, edge] as const));
const monsterById = new Map(level.monsters.map((monster) => [monster.id, monster] as const));
const TUTORIAL_ROUTE_EDGE_ID = 'battery-industrial';

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));
const round = (value: number): number => Math.round(value);
const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};
const assetImg = (url: string, className: string, alt = ''): string => url
  ? `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`
  : '';

const iconFor = (kind: PowerNodeConfig['kind']): string => ({
  generator: '⚡', substation: 'M', battery: '▣', hospital: '✚',
  residential: '▦', commercial: '▣', industrial: '▥', junction: '↯'
})[kind];

const lineClass = (edge: EdgeRuntimeState): string => {
  if (edge.operatingState === 'offline') return 'battle-line battle-line--offline';
  if (edge.loadState === 'overload') return 'battle-line battle-line--overload';
  if (edge.loadState === 'high') return 'battle-line battle-line--high';
  if (edge.loadState === 'broken') return 'battle-line battle-line--broken';
  return 'battle-line battle-line--normal';
};

const edgeStatusText = (edge: EdgeRuntimeState): string => {
  if (edge.bossLockRemainingSeconds > 0) return `兽王锁定 ${Math.ceil(edge.bossLockRemainingSeconds)}s`;
  if (edge.operatingState === 'broken') return `损坏 · 修复 ${Math.ceil(edge.repairRemainingSeconds)}s`;
  if (edge.operatingState === 'offline') return '断开';
  if (edge.overloadRemainingSeconds > 0) return `过载 ${edge.overloadRemainingSeconds.toFixed(1)}s`;
  if (edge.overloadCooldownRemainingSeconds > 0) return `冷却 ${Math.ceil(edge.overloadCooldownRemainingSeconds)}s`;
  return '可过载';
};

const nodeClass = (node: NodeRuntimeState, config: PowerNodeConfig): string => {
  const classes = ['battle-node', `battle-node--${config.kind}`];
  if (node.operatingState === 'offline') classes.push('battle-node--offline');
  if (node.powerPercent < 98 && (config.demandMw ?? 0) > 0) classes.push('battle-node--underpowered');
  return classes.join(' ');
};

const nodeWrapClass = (
  node: NodeRuntimeState,
  config: PowerNodeConfig,
  hasSprite: boolean,
  selected: boolean,
  variant?: string
): string => {
  const classes = ['battle-node-wrap'];
  if (hasSprite) classes.push('battle-node-wrap--has-sprite');
  if (selected) classes.push('battle-node-wrap--selected');
  if (node.operatingState === 'offline') classes.push('battle-node-wrap--offline');
  if (node.powerPercent < 98 && (config.demandMw ?? 0) > 0) classes.push('battle-node-wrap--underpowered');
  if (variant) classes.push(`battle-node-wrap--${variant}`);
  return classes.join(' ');
};

const monsterPosition = (monster: MonsterRuntimeState): { x: number; y: number } => {
  const current = nodeById.get(monster.currentNodeId);
  if (!current) return { x: 50, y: 50 };
  const next = monster.nextNodeId ? nodeById.get(monster.nextNodeId) : undefined;
  if (!next) return { x: current.x, y: current.y };
  return {
    x: current.x + (next.x - current.x) * monster.progress,
    y: current.y + (next.y - current.y) * monster.progress
  };
};

const cityBlocks = (): string => Array.from({ length: 88 }, (_, index) => {
  const column = index % 11;
  const row = Math.floor(index / 11);
  const x = 4 + column * 8.8 + (row % 2) * 2.4;
  const y = 9 + row * 10.3;
  const width = 3.2 + (index % 4) * 0.55;
  const height = 2.2 + (index % 5) * 0.38;
  return `<g class="city-block${index % 3 === 0 ? ' city-block--lit' : ''}" transform="translate(${x} ${y})">
    <polygon points="0,${height} ${width},${height + 1.5} ${width + 2.4},${height} 2.4,${height - 1.5}" />
    <polygon class="city-block__roof" points="0,${height} 2.4,${height - 1.5} ${width + 2.4},${height} ${width},${height + 1.5}" />
    <rect class="city-block__window" x="1" y="${height - 0.2}" width="0.45" height="0.45" />
  </g>`;
}).join('');

export class BattleApp {
  private readonly engine = new BattleEngine(level);
  private readonly audio = new BattleAudio();
  private frameId = 0;
  private lastFrameAt = 0;
  private lastRenderAt = 0;
  private selectedNodeId?: string;
  private selectedEdgeId?: string;
  private notice = '';
  private tutorialStep = 0;
  private tutorialSkipped = false;
  private peakCriticalOutageSeconds = 0;
  private readonly brokenLineIds = new Set<string>();
  private routeSwitches = 0;
  private overloads = 0;
  private lastStatus: BattleSnapshot['status'] = 'ready';
  private lastLockedEdgeIds = new Set<string>();
  private hospitalWarningActive = false;
  private bossIncomingWarned = false;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    document.documentElement.dataset.gameMode = 'grid-defense';
    document.title = `${level.name} · Energy Grid Tycoon`;
    this.root.className = 'battle-root';
    this.root.addEventListener('click', this.handleClick);
    this.preloadAssets();
    this.render(this.engine.snapshot());
    this.lastFrameAt = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    this.audio.destroy();
    this.root.removeEventListener('click', this.handleClick);
    this.root.replaceChildren();
  }

  private preloadAssets(): void {
    for (const url of BATTLE_ASSET_URLS) {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
    }
  }

  private readonly loop = (now: number): void => {
    const deltaSeconds = Math.min(0.1, Math.max(0, (now - this.lastFrameAt) / 1000));
    this.lastFrameAt = now;
    this.engine.tick(deltaSeconds);
    if (now - this.lastRenderAt >= 80) {
      this.render(this.engine.snapshot());
      this.lastRenderAt = now;
    }
    this.frameId = requestAnimationFrame(this.loop);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-node-id], [data-edge-id], [data-action]')
      : null;
    if (!target) return;

    if (target.dataset.nodeId) {
      this.audio.play('ui');
      this.selectedNodeId = target.dataset.nodeId;
      this.selectedEdgeId = undefined;
      this.notice = `已选择：${nodeById.get(this.selectedNodeId)?.label ?? this.selectedNodeId}`;
    } else if (target.dataset.edgeId) {
      this.audio.play('ui');
      this.selectedEdgeId = target.dataset.edgeId;
      this.selectedNodeId = undefined;
      const edge = edgeById.get(this.selectedEdgeId);
      this.notice = edge
        ? `已选择线路：${nodeById.get(edge.from)?.label ?? '?'} → ${nodeById.get(edge.to)?.label ?? '?'}`
        : '已选择线路';
    } else {
      const action = target.dataset.action;
      if (action === 'start-battle') {
        this.audio.unlock();
        this.audio.play('ui');
        this.engine.start();
        this.notice = '先切换一条支路，让第一波进入你准备好的陷阱。';
      } else if (action === 'skip-tutorial') {
        this.audio.play('ui');
        this.tutorialSkipped = true;
        this.notice = '引导已跳过。守住医院，利用线路改道和过载消灭怪物。';
      } else if (action === 'toggle-zone') {
        const result = this.selectedNodeId
          ? this.engine.toggleZone(this.selectedNodeId)
          : { ok: false, message: '先点击一个可关闭区域。' };
        this.notice = result.message;
        if (result.ok) this.audio.play('switch');
      } else if (action === 'switch-route') {
        const result = this.selectedEdgeId
          ? this.engine.switchRoute(this.selectedEdgeId)
          : { ok: false, message: '先点击一条线路。' };
        this.notice = result.message;
        if (result.ok) {
          this.routeSwitches += 1;
          this.audio.play('switch');
          if (!this.tutorialSkipped && this.tutorialStep === 0) this.tutorialStep = 1;
        }
      } else if (action === 'overload') {
        const result = this.selectedEdgeId
          ? this.engine.forceOverload(this.selectedEdgeId)
          : { ok: false, message: '先点击怪物正在经过的线路。' };
        this.notice = result.message;
        if (result.ok) {
          this.overloads += 1;
          this.audio.play('overload');
          if (!this.tutorialSkipped && this.tutorialStep >= 2) this.tutorialStep = 4;
        }
      } else if (action === 'pause') {
        this.audio.play('ui');
        this.engine.pause();
      } else if (action === 'restart') {
        this.audio.play('ui');
        this.selectedNodeId = undefined;
        this.selectedEdgeId = undefined;
        this.notice = '';
        this.tutorialSkipped = true;
        this.resetPerformance();
        this.engine.restart();
      } else if (action === 'mute') {
        this.audio.toggleMuted();
      } else if (action === 'tycoon') {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'tycoon');
        window.location.assign(url);
        return;
      }
    }
    this.render(this.engine.snapshot());
  };

  private resetPerformance(): void {
    this.peakCriticalOutageSeconds = 0;
    this.brokenLineIds.clear();
    this.routeSwitches = 0;
    this.overloads = 0;
    this.lastLockedEdgeIds.clear();
    this.hospitalWarningActive = false;
    this.bossIncomingWarned = false;
    this.lastStatus = 'running';
  }

  private updateCommercialState(snapshot: BattleSnapshot): void {
    this.peakCriticalOutageSeconds = Math.max(this.peakCriticalOutageSeconds, snapshot.criticalOutageSeconds);
    for (const edge of snapshot.edges) {
      if (edge.operatingState === 'broken') this.brokenLineIds.add(edge.id);
    }

    if (!this.tutorialSkipped) {
      if (this.tutorialStep === 1 && snapshot.monsters.some((monster) => monster.alive)) {
        this.tutorialStep = 2;
      }
      if (
        this.tutorialStep === 2
        && this.selectedEdgeId
        && snapshot.monsters.some((monster) => monster.alive && monster.currentEdgeId === this.selectedEdgeId)
      ) {
        this.tutorialStep = 3;
      }
    }

    const lockedNow = new Set(
      snapshot.edges.filter((edge) => edge.bossLockRemainingSeconds > 0).map((edge) => edge.id)
    );
    if ([...lockedNow].some((edgeId) => !this.lastLockedEdgeIds.has(edgeId))) this.audio.play('boss');
    this.lastLockedEdgeIds = lockedNow;

    const hospitalDanger = snapshot.criticalOutageSeconds > 0;
    if (hospitalDanger && !this.hospitalWarningActive) this.audio.play('warning');
    this.hospitalWarningActive = hospitalDanger;

    if (
      !this.bossIncomingWarned
      && snapshot.currentWaveIndex === 2
      && snapshot.nextWaveInSeconds > 0
      && snapshot.nextWaveInSeconds <= 8
    ) {
      this.bossIncomingWarned = true;
      this.audio.play('warning');
    }

    if (snapshot.status !== this.lastStatus) {
      if (snapshot.status === 'victory') this.audio.play('victory');
      if (snapshot.status === 'defeat') this.audio.play('defeat');
      this.lastStatus = snapshot.status;
    }
  }

  private tutorialTargetEdge(snapshot: BattleSnapshot): string | undefined {
    if (this.tutorialSkipped) return undefined;
    if (this.tutorialStep === 0) return TUTORIAL_ROUTE_EDGE_ID;
    if (this.tutorialStep === 2) {
      return snapshot.monsters.find((monster) => monster.alive && monster.currentEdgeId)?.currentEdgeId;
    }
    return undefined;
  }

  private tutorialMarkup(snapshot: BattleSnapshot): string {
    if (this.tutorialSkipped || snapshot.status !== 'running') return '';
    const copy = [
      ['1 / 4 · 改变路线', '点击地图上闪烁的推荐线路，再点「切换线路」。先把默认路线改成你的陷阱。'],
      ['2 / 4 · 看怪改道', '第一只噬电兽正在进入电网。观察它沿你刚刚改变的路线前进。'],
      ['3 / 4 · 选中怪群', '点击怪物脚下的线路。过载只会伤害当前在线路上的怪物。'],
      ['4 / 4 · 强制过载', '怪物进入线路后点「强制过载」。尽量等多只怪聚在一起再放电。']
    ] as const;
    if (this.tutorialStep >= 4) {
      return snapshot.elapsedSeconds < 22
        ? '<aside class="battle-tutorial battle-tutorial--complete"><b>✓ 战术链已掌握</b><span>改路 → 聚怪 → 过载。接下来自己守住医院。</span></aside>'
        : '';
    }
    const step = copy[this.tutorialStep] ?? copy[0];
    return `<aside class="battle-tutorial">
      <div><small>新手引导</small><b>${escapeHtml(step[0])}</b><p>${escapeHtml(step[1])}</p></div>
      <button data-action="skip-tutorial">跳过</button>
    </aside>`;
  }

  private waveAlertMarkup(snapshot: BattleSnapshot): string {
    if (snapshot.status !== 'running') return '';
    if (snapshot.currentWaveIndex === 0 || (snapshot.currentWaveIndex === 1 && snapshot.elapsedSeconds < 5.5)) {
      return `<div class="battle-wave-alert">${assetImg(BATTLE_UI_ASSETS.waveStart, 'battle-wave-alert__icon')}<span><small>WAVE 01</small><b>侦察群进入城市电网</b></span></div>`;
    }
    if (snapshot.currentWaveIndex === 1 && snapshot.nextWaveInSeconds > 0 && snapshot.nextWaveInSeconds <= 4) {
      return `<div class="battle-wave-alert battle-wave-alert--warning">${assetImg(BATTLE_UI_ASSETS.waveStart, 'battle-wave-alert__icon')}<span><small>WAVE 02</small><b>双向突袭 · ${Math.ceil(snapshot.nextWaveInSeconds)} 秒</b></span></div>`;
    }
    if (snapshot.currentWaveIndex === 2 && snapshot.nextWaveInSeconds > 0 && snapshot.nextWaveInSeconds <= 8) {
      return `<div class="battle-wave-alert battle-wave-alert--boss">${assetImg(BATTLE_UI_ASSETS.bossIncoming, 'battle-wave-alert__icon')}<span><small>BOSS WARNING</small><b>兽王压境 · ${Math.ceil(snapshot.nextWaveInSeconds)} 秒</b></span></div>`;
    }
    return '';
  }

  private briefingMarkup(snapshot: BattleSnapshot): string {
    if (snapshot.status !== 'ready') return '';
    return `<section class="battle-briefing">
      <div class="battle-briefing__card">
        <div class="battle-briefing__eyebrow">CITY-01 · 首场防卫战</div>
        <h2>噬电兽围城</h2>
        <p>${escapeHtml(level.subtitle)}</p>
        <div class="battle-briefing__mission"><b>任务目标</b><span>医院累计断电不能超过 ${round(snapshot.criticalOutageLimitSeconds)} 秒。</span></div>
        <div class="battle-briefing__loop">
          <span><b>01</b>切线路<small>改变怪物路线</small></span>
          <i>→</i>
          <span><b>02</b>聚怪<small>把怪引到同一段线</small></span>
          <i>→</i>
          <span><b>03</b>过载<small>消耗储能群体电击</small></span>
        </div>
        <div class="battle-briefing__rules"><span>⚡ 每次过载消耗 ${level.overloadEnergyCostMwh} MWh</span><span>♨ 连续过载会升温熔断</span><span>☠ Boss 会锁死线路开关</span></div>
        <button data-action="start-battle">开始防守</button>
      </div>
    </section>`;
  }

  private render(snapshot: BattleSnapshot): void {
    this.updateCommercialState(snapshot);
    const nodes = new Map(snapshot.nodes.map((node) => [node.id, node] as const));
    const edges = new Map(snapshot.edges.map((edge) => [edge.id, edge] as const));
    const selectedNode = this.selectedNodeId ? nodeById.get(this.selectedNodeId) : undefined;
    const selectedNodeRuntime = this.selectedNodeId ? nodes.get(this.selectedNodeId) : undefined;
    const selectedEdgeConfig = this.selectedEdgeId ? edgeById.get(this.selectedEdgeId) : undefined;
    const selectedEdgeRuntime = this.selectedEdgeId ? edges.get(this.selectedEdgeId) : undefined;
    const selectedEdgeHasMonster = Boolean(this.selectedEdgeId && snapshot.monsters.some((monster) => (
      monster.alive && monster.currentEdgeId === this.selectedEdgeId
    )));
    const batteryPercent = snapshot.batteryCapacityMwh > 0
      ? snapshot.batteryEnergyMwh / snapshot.batteryCapacityMwh * 100
      : 0;
    const batteryDischarging = snapshot.totalDemandMw > snapshot.totalSupplyMw && snapshot.batteryEnergyMwh > 0;
    const tutorialTargetEdgeId = this.tutorialTargetEdge(snapshot);

    const edgeMarkup = level.edges.map((edge) => {
      const runtime = edges.get(edge.id);
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!runtime || !from || !to) return '';
      const midpointX = (from.x + to.x) / 2;
      const midpointY = (from.y + to.y) / 2;
      const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
      const overlay = edgeOverlayFor(runtime);
      const overlayMarkup = overlay?.url
        ? `<g class="battle-edge-overlay battle-edge-overlay--${overlay.variant}" transform="translate(${midpointX} ${midpointY}) rotate(${angle})">
            <image href="${escapeHtml(overlay.url)}" x="${-overlay.width / 2}" y="${-overlay.height / 2}" width="${overlay.width}" height="${overlay.height}" preserveAspectRatio="xMidYMid meet" />
          </g>`
        : '';
      const overloadMarker = runtime.loadState === 'overload' && overloadNodeSpriteUrl
        ? `<image class="battle-overload-node" href="${escapeHtml(overloadNodeSpriteUrl)}" x="${midpointX - 3.5}" y="${midpointY - 2.35}" width="7" height="4.7" preserveAspectRatio="xMidYMid meet" />`
        : '';
      const bossLockMarker = runtime.bossLockRemainingSeconds > 0
        ? `<g class="battle-boss-lock" transform="translate(${midpointX} ${midpointY - 1.1})">
            <circle r="2.2" />
            <text class="battle-boss-lock__icon" text-anchor="middle" y=".35">锁</text>
            <text class="battle-boss-lock__time" text-anchor="middle" y="2.9">${Math.ceil(runtime.bossLockRemainingSeconds)}s</text>
          </g>`
        : '';
      const lockedClass = runtime.bossLockRemainingSeconds > 0 ? ' battle-edge-target--boss-locked' : '';
      const tutorialClass = tutorialTargetEdgeId === edge.id ? ' battle-edge-target--tutorial' : '';
      return `<g data-edge-id="${edge.id}" class="battle-edge-target${lockedClass}${tutorialClass}">
        <line class="battle-line-shadow" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
        <line class="${lineClass(runtime)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
        ${overlayMarkup}${overloadMarker}${bossLockMarker}
        <line class="battle-line-hit${edge.id === this.selectedEdgeId ? ' battle-line-hit--selected' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
      </g>`;
    }).join('');

    const nodeMarkup = level.nodes.map((config) => {
      const runtime = nodes.get(config.id);
      if (!runtime) return '';
      const sprite = facilitySpriteFor(config, runtime, batteryDischarging);
      const showCard = config.kind !== 'junction' && !config.id.startsWith('spawn-');
      const demand = config.demandMw ?? 0;
      const status = runtime.operatingState === 'offline'
        ? '已关闭'
        : demand > 0 ? `供电 ${round(runtime.powerPercent)}%`
          : config.kind === 'generator' ? '运行中' : config.kind === 'battery' ? `储能 ${round(batteryPercent)}%` : '已接通';
      const spriteMarkup = sprite?.url
        ? `<rect class="battle-facility-hitbox" x="${-sprite.width / 2}" y="${-sprite.height + sprite.baselineOffset}" width="${sprite.width}" height="${sprite.height}" rx="1.2" />
          <image class="battle-facility-sprite${sprite.variant ? ` battle-facility-sprite--${sprite.variant}` : ''}" href="${escapeHtml(sprite.url)}" x="${-sprite.width / 2}" y="${-sprite.height + sprite.baselineOffset}" width="${sprite.width}" height="${sprite.height}" preserveAspectRatio="xMidYMax meet" />`
        : '';
      const cardTransform = sprite ? `translate(${sprite.cardX} ${sprite.cardY})` : 'translate(3.1 -5.5)';
      const haloRadius = sprite ? 2.45 : 3.4;
      const markerRadius = sprite ? 1.35 : 2.05;
      return `<g class="${nodeWrapClass(runtime, config, Boolean(sprite?.url), config.id === this.selectedNodeId, sprite?.variant)}" data-node-id="${config.id}" transform="translate(${config.x} ${config.y})">
        ${spriteMarkup}
        <circle class="battle-node-halo" r="${haloRadius}" />
        <circle class="${nodeClass(runtime, config)}" r="${markerRadius}" />
        <text class="battle-node-icon" text-anchor="middle" y="${sprite ? 0.5 : 0.72}">${escapeHtml(iconFor(config.kind))}</text>
        ${showCard ? `<g class="facility-card" transform="${cardTransform}">
          <rect width="12.2" height="7.4" rx="1" />
          <text class="facility-card__title" x="1" y="2">${escapeHtml(config.label)}</text>
          <text class="facility-card__value" x="1" y="4.2">${demand > 0 ? `${demand} MW` : config.kind === 'generator' ? `${config.supplyMw ?? 0} MW` : `${round(snapshot.batteryEnergyMwh)} MWh`}</text>
          <text class="facility-card__status" x="1" y="6.25">${escapeHtml(status)}</text>
        </g>` : ''}
      </g>`;
    }).join('');

    const visibleMonsters = snapshot.monsters.filter((monster) => (
      monster.alive || (monster.defeatedAtSeconds !== undefined && snapshot.elapsedSeconds - monster.defeatedAtSeconds <= 0.9)
    ));
    const monsterMarkup = visibleMonsters.map((monster) => {
      const position = monsterPosition(monster);
      const archetype = monsterById.get(monster.archetypeId);
      const currentEdge = monster.currentEdgeId ? edges.get(monster.currentEdgeId) : undefined;
      const beingOverloaded = monster.alive && currentEdge?.loadState === 'overload';
      const bossCasting = monster.archetypeId === 'boss'
        && monster.abilityActiveUntilSeconds !== undefined
        && monster.abilityActiveUntilSeconds > snapshot.elapsedSeconds;
      let visualState: MonsterVisualState = 'walk';
      if (!monster.alive) visualState = 'death';
      else if (beingOverloaded && monster.archetypeId === 'crawler') visualState = 'stunned';
      else if (beingOverloaded && monster.archetypeId === 'brute') visualState = 'break-armor';
      else if (beingOverloaded) visualState = 'hit';
      else if (bossCasting || (monster.archetypeId === 'boss' && monster.reachedTarget)) visualState = 'roar';
      const sprite = monsterSpriteFor(monster.archetypeId, visualState);
      const hpRatio = clampPercent(monster.hp / Math.max(1, monster.maxHp) * 100) / 100;
      const dangerRadius = 3.4 * ((archetype?.radius ?? 8) / 8);
      const bossClass = monster.archetypeId === 'boss' ? ' battle-monster--boss' : '';
      const stateClass = ` battle-monster--${visualState}`;
      if (sprite?.url) {
        const hpWidth = 6 * hpRatio;
        const deathEffect = !monster.alive && monsterDeathEffectUrl
          ? `<image class="battle-monster__death-effect" href="${escapeHtml(monsterDeathEffectUrl)}" x="-5" y="-5" width="10" height="8" preserveAspectRatio="xMidYMid meet" />`
          : '';
        return `<g class="battle-monster${bossClass}${stateClass}" transform="translate(${position.x} ${position.y})">
          <circle class="battle-monster__danger" r="${dangerRadius}" />
          ${deathEffect}
          <image class="battle-monster__sprite" href="${escapeHtml(sprite.url)}" x="${-sprite.width / 2}" y="${-sprite.height + 1.15}" width="${sprite.width}" height="${sprite.height}" preserveAspectRatio="xMidYMax meet" />
          ${monster.alive ? `<rect class="battle-monster__hp-bg" x="-3" y="${sprite.hpY}" width="6" height=".42" rx=".2" />
          <rect class="battle-monster__hp" x="-3" y="${sprite.hpY}" width="${hpWidth}" height=".42" rx=".2" />` : ''}
        </g>`;
      }
      const scale = (archetype?.radius ?? 8) / 8;
      const hpWidth = 5 * hpRatio;
      return `<g class="battle-monster${bossClass}${stateClass}" transform="translate(${position.x} ${position.y}) scale(${scale})">
        <circle class="battle-monster__danger" r="3.4" />
        <path class="battle-monster__body" d="M-1.8 .7 L-2.5 -.6 L-1.2 -1.9 L0 -1.35 L1.2 -1.9 L2.5 -.6 L1.8 .7 L.9 1.8 L0 1.25 L-.9 1.8 Z" />
        <circle class="battle-monster__eye" cx="-.65" cy="-.25" r=".22" />
        <circle class="battle-monster__eye" cx=".65" cy="-.25" r=".22" />
        <rect class="battle-monster__hp-bg" x="-2.5" y="-3" width="5" height=".38" rx=".2" />
        <rect class="battle-monster__hp" x="-2.5" y="-3" width="${hpWidth}" height=".38" rx=".2" />
      </g>`;
    }).join('');

    const batteryNode = nodeById.get('battery');
    const batteryEffectMarkup = batteryDischarging && batteryNode && batteryDischargeEffectUrl
      ? `<image class="battle-battery-discharge-effect" href="${escapeHtml(batteryDischargeEffectUrl)}" x="${batteryNode.x - 5}" y="${batteryNode.y - 7}" width="10" height="8" preserveAspectRatio="xMidYMid meet" />`
      : '';

    const selectionText = selectedNodeRuntime
      ? `${selectedNodeRuntime.operatingState === 'online' ? '在线' : '关闭'} · ${round(selectedNodeRuntime.powerPercent)}%`
      : selectedEdgeRuntime
        ? `${round(selectedEdgeRuntime.loadPercent)}% 负载 · 温度 ${round(selectedEdgeRuntime.heatPercent)}% · ${edgeStatusText(selectedEdgeRuntime)}`
        : '点击建筑或电力线路进行操作';

    const switchDisabled = !selectedEdgeRuntime
      || selectedEdgeConfig?.switchable !== true
      || selectedEdgeRuntime.bossLockRemainingSeconds > 0
      || selectedEdgeRuntime.operatingState === 'broken';
    const switchActionHint = selectedEdgeRuntime
      ? selectedEdgeRuntime.bossLockRemainingSeconds > 0
        ? `兽王锁定 ${Math.ceil(selectedEdgeRuntime.bossLockRemainingSeconds)}s`
        : selectedEdgeRuntime.operatingState === 'broken'
          ? `线路损坏 · ${Math.ceil(selectedEdgeRuntime.repairRemainingSeconds)}s 修复`
          : selectedEdgeConfig?.switchable !== true ? '固定线路 · 无法切换' : '改变怪物行进路径'
      : '先选中可切换线路';
    const switchActionClass = selectedEdgeRuntime && (
      selectedEdgeRuntime.bossLockRemainingSeconds > 0 || selectedEdgeRuntime.operatingState === 'broken'
    ) ? ' battle-action--locked' : '';

    const overloadDisabled = !selectedEdgeRuntime
      || !selectedEdgeHasMonster
      || selectedEdgeRuntime.operatingState !== 'online'
      || selectedEdgeRuntime.overloadRemainingSeconds > 0
      || selectedEdgeRuntime.overloadCooldownRemainingSeconds > 0;
    const overloadActionHint = selectedEdgeRuntime
      ? selectedEdgeRuntime.operatingState === 'broken'
        ? `线路损坏 · ${Math.ceil(selectedEdgeRuntime.repairRemainingSeconds)}s 修复`
        : selectedEdgeRuntime.overloadRemainingSeconds > 0
          ? `放电中 · ${selectedEdgeRuntime.overloadRemainingSeconds.toFixed(1)}s`
          : selectedEdgeRuntime.overloadCooldownRemainingSeconds > 0
            ? `冷却 ${Math.ceil(selectedEdgeRuntime.overloadCooldownRemainingSeconds)}s · 温度 ${round(selectedEdgeRuntime.heatPercent)}%`
            : !selectedEdgeHasMonster
              ? `等怪进入 · 温度 ${round(selectedEdgeRuntime.heatPercent)}%`
              : `消耗 ${level.overloadEnergyCostMwh} MWh · 命中当前线路怪物`
      : `消耗 ${level.overloadEnergyCostMwh} MWh · 先选中线路`;
    const overloadActionClass = selectedEdgeRuntime && (
      selectedEdgeRuntime.operatingState === 'broken'
      || selectedEdgeRuntime.overloadRemainingSeconds > 0
      || selectedEdgeRuntime.overloadCooldownRemainingSeconds > 0
    ) ? ' battle-action--cooldown' : '';
    const toggleDisabled = !selectedNode || selectedNode.lockedOnline || selectedNode.kind === 'hospital' || selectedNode.kind === 'junction';

    const boss = snapshot.monsters.find((monster) => monster.alive && monster.archetypeId === 'boss');
    const bossHpPercent = boss ? clampPercent(boss.hp / Math.max(1, boss.maxHp) * 100) : 0;
    const bossHud = boss
      ? `<aside class="battle-boss-hud">
          <div><small>大型噬电兽</small><strong>BOSS</strong><span>电网锁定 ${Math.ceil(boss.abilityCooldownRemainingSeconds ?? 0)}s</span></div>
          <div class="battle-boss-hud__bar"><i style="width:${bossHpPercent}%"></i></div>
          <b>${round(boss.hp)} / ${round(boss.maxHp)} HP</b>
        </aside>`
      : '';

    const grade = gradeBattle(snapshot, {
      peakCriticalOutageSeconds: this.peakCriticalOutageSeconds,
      lineBreaks: this.brokenLineIds.size,
      routeSwitches: this.routeSwitches,
      overloads: this.overloads
    });
    const stars = snapshot.status === 'victory'
      ? `<div class="battle-grade__stars" aria-label="${grade.stars} 星">${[1, 2, 3].map((star) => `<span class="${star <= grade.stars ? 'is-active' : ''}">★</span>`).join('')}</div>`
      : '';
    const outcomeAsset = snapshot.status === 'victory' ? BATTLE_UI_ASSETS.victory : BATTLE_UI_ASSETS.defeat;
    const outcome = snapshot.status === 'victory' || snapshot.status === 'defeat'
      ? `<div class="battle-outcome battle-outcome--${snapshot.status}">
          <div class="battle-outcome__panel">
            ${assetImg(outcomeAsset, 'battle-outcome__art')}
            <div class="battle-outcome__title">${snapshot.status === 'victory' ? '城市守住了！' : '防线失守'}</div>
            ${stars}
            ${snapshot.status === 'victory' ? `<div class="battle-grade__score">${grade.score}<small>/ 100</small></div>` : ''}
            <p class="battle-outcome__reason">${escapeHtml(snapshot.message)}</p>
            <div class="battle-grade__stats">
              <span><small>医院最大断电</small><b>${round(this.peakCriticalOutageSeconds)}s</b></span>
              <span><small>剩余储能</small><b>${round(snapshot.batteryEnergyMwh)} MWh</b></span>
              <span><small>线路熔断</small><b>${this.brokenLineIds.size}</b></span>
              <span><small>改道 / 过载</small><b>${this.routeSwitches} / ${this.overloads}</b></span>
              <span><small>用时</small><b>${formatClock(snapshot.elapsedSeconds)}</b></span>
            </div>
            <div class="battle-grade__tip"><b>${snapshot.status === 'victory' ? '下一星怎么拿' : '下次怎么守'}</b><span>${escapeHtml(grade.recommendation)}</span></div>
            <button data-action="restart">${assetImg(BATTLE_UI_ASSETS.restart, 'battle-outcome__restart-icon')}重新挑战</button>
          </div>
        </div>`
      : '';

    const hospitalInDanger = snapshot.criticalOutageSeconds > 0;
    const currentWave = snapshot.currentWaveIndex > 0 ? level.waves[snapshot.currentWaveIndex - 1] : level.waves[0];
    const pauseOverlay = snapshot.status === 'paused'
      ? `<div class="battle-pause-overlay"><div><b>战斗暂停</b><span>电网状态已冻结</span><button data-action="pause">继续防守</button></div></div>`
      : '';
    const tutorialOverloadClass = !this.tutorialSkipped && this.tutorialStep === 3 ? ' battle-action--tutorial' : '';

    this.root.innerHTML = `<main class="battle-shell">
      <header class="battle-header">
        <section class="battle-brand"><h1>${escapeHtml(level.name)} <span>⚡</span></h1><p>${escapeHtml(level.subtitle)}</p></section>
        <section class="battle-meter">
          <div><b>⚡</b><span><small>当前供电</small><strong>${round(snapshot.totalAllocatedMw)} / ${round(snapshot.totalSupplyMw)} MW</strong></span></div>
          <div><b class="green">▣</b><span><small>储能</small><strong>${round(batteryPercent)}%</strong><em>${round(snapshot.batteryEnergyMwh)} / ${round(snapshot.batteryCapacityMwh)} MWh</em></span></div>
        </section>
        <section class="battle-wave">${assetImg(BATTLE_UI_ASSETS.nextWave, 'battle-wave__icon')}<span><small>${escapeHtml(currentWave?.label ?? '准备')}</small><strong>第 ${Math.max(1, snapshot.currentWaveIndex)} / ${snapshot.totalWaves} 波</strong></span><b>${formatClock(snapshot.nextWaveInSeconds > 0 ? snapshot.nextWaveInSeconds : snapshot.elapsedSeconds)}</b></section>
        <button class="battle-sound" data-action="mute" aria-label="${this.audio.isMuted ? '开启声音' : '关闭声音'}">${this.audio.isMuted ? '🔇' : '🔊'}</button>
        <button class="battle-pause" data-action="pause" aria-label="暂停">${snapshot.status === 'paused' ? '▶' : assetImg(BATTLE_UI_ASSETS.pause, 'battle-pause__icon')}</button>
      </header>

      <aside class="battle-objective${hospitalInDanger ? ' battle-objective--danger' : ''}">
        <h2>当前目标</h2><h3>${hospitalInDanger ? assetImg(BATTLE_UI_ASSETS.hospitalAlarm, 'battle-objective__alarm') : '<span>✚</span>'} 保护医院</h3>
        <p>医院断电时间不能超过 ${round(snapshot.criticalOutageLimitSeconds)} 秒</p>
        <div class="objective-progress"><i style="width:${clampPercent(snapshot.criticalOutageSeconds / Math.max(1, snapshot.criticalOutageLimitSeconds) * 100)}%"></i></div>
        <strong>断电时间：${round(snapshot.criticalOutageSeconds)} / ${round(snapshot.criticalOutageLimitSeconds)} 秒</strong>
        <div class="objective-hint">关闭支路改道，把怪聚在同一线路，再用储能强制过载。</div>
      </aside>

      ${bossHud}
      ${this.waveAlertMarkup(snapshot)}
      ${this.tutorialMarkup(snapshot)}

      <section class="battle-map"><svg viewBox="0 0 100 88" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="mapGlow"><stop offset="0" stop-color="#12384a" stop-opacity=".45"/><stop offset="1" stop-color="#02070c" stop-opacity="0"/></radialGradient></defs>
        <rect class="battle-map__base" width="100" height="88"/><ellipse class="battle-map__glow" cx="48" cy="45" rx="49" ry="41"/>
        <g>${cityBlocks()}</g><g class="battle-roads"><path d="M2 28 L98 58 M4 58 L92 16 M12 82 L88 4 M20 5 L96 40 M0 43 L78 86"/></g>
        <g>${edgeMarkup}</g><g>${nodeMarkup}</g><g>${batteryEffectMarkup}</g><g>${monsterMarkup}</g>
      </svg></section>

      <section class="battle-selection"><strong>${selectedNode ? escapeHtml(selectedNode.label) : this.selectedEdgeId ? '已选择线路' : '战术控制'}</strong><span>${selectionText}</span></section>
      <nav class="battle-actions">
        <button data-action="toggle-zone" class="yellow" ${toggleDisabled ? 'disabled' : ''}>${assetImg(BATTLE_UI_ASSETS.closeZone, 'battle-action-icon')}<strong>开关区域</strong><span>${selectedNode ? '关闭负荷、改变供电压力' : '先选中建筑区域'}</span></button>
        <button data-action="switch-route" class="${switchActionClass.trim()}" ${switchDisabled ? 'disabled' : ''}>${assetImg(BATTLE_UI_ASSETS.switchRoute, 'battle-action-icon')}<strong>切换线路</strong><span>${escapeHtml(switchActionHint)}</span></button>
        <button data-action="overload" class="red${overloadActionClass}${tutorialOverloadClass}" ${overloadDisabled ? 'disabled' : ''}>${assetImg(BATTLE_UI_ASSETS.forceOverload, 'battle-action-icon')}<strong>强制过载</strong><span>${escapeHtml(overloadActionHint)}</span></button>
        <button data-action="tycoon" class="muted"><b>⌂</b><strong>旧版城市</strong><span>返回经营模式</span></button>
      </nav>
      <section class="battle-message">${escapeHtml(this.notice || snapshot.message)}</section>
      ${this.briefingMarkup(snapshot)}
      ${pauseOverlay}
      ${outcome}
    </main>`;
  }
}
