import { BATTLE_ASSET_URLS, facilitySpriteFor, monsterSpriteFor, overloadNodeSpriteUrl } from './BattleAssetCatalog';
import { BattleEngine } from './BattleEngine';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';
import type { BattleSnapshot, EdgeRuntimeState, MonsterRuntimeState, NodeRuntimeState, PowerNodeConfig } from './types';
import './battle.css';
import './battle-assets.css';

const level = CITY01_SIEGE_LEVEL;
const nodeById = new Map(level.nodes.map((node) => [node.id, node] as const));
const edgeById = new Map(level.edges.map((edge) => [edge.id, edge] as const));
const monsterById = new Map(level.monsters.map((monster) => [monster.id, monster] as const));

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
  selected: boolean
): string => {
  const classes = ['battle-node-wrap'];
  if (hasSprite) classes.push('battle-node-wrap--has-sprite');
  if (selected) classes.push('battle-node-wrap--selected');
  if (node.operatingState === 'offline') classes.push('battle-node-wrap--offline');
  if (node.powerPercent < 98 && (config.demandMw ?? 0) > 0) classes.push('battle-node-wrap--underpowered');
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
  private frameId = 0;
  private lastFrameAt = 0;
  private lastRenderAt = 0;
  private selectedNodeId?: string;
  private selectedEdgeId?: string;
  private notice = '';

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    document.documentElement.dataset.gameMode = 'grid-defense';
    document.title = `${level.name} · Energy Grid Tycoon`;
    this.root.className = 'battle-root';
    this.root.addEventListener('click', this.handleClick);
    this.preloadAssets();
    this.engine.start();
    this.render(this.engine.snapshot());
    this.lastFrameAt = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
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
      this.selectedNodeId = target.dataset.nodeId;
      this.selectedEdgeId = undefined;
      this.notice = `已选择：${nodeById.get(this.selectedNodeId)?.label ?? this.selectedNodeId}`;
    } else if (target.dataset.edgeId) {
      this.selectedEdgeId = target.dataset.edgeId;
      this.selectedNodeId = undefined;
      const edge = edgeById.get(this.selectedEdgeId);
      this.notice = edge
        ? `已选择线路：${nodeById.get(edge.from)?.label ?? '?'} → ${nodeById.get(edge.to)?.label ?? '?'}`
        : '已选择线路';
    } else {
      const action = target.dataset.action;
      if (action === 'toggle-zone') {
        this.notice = this.selectedNodeId ? this.engine.toggleZone(this.selectedNodeId).message : '先点击一个可关闭区域。';
      } else if (action === 'switch-route') {
        this.notice = this.selectedEdgeId ? this.engine.switchRoute(this.selectedEdgeId).message : '先点击一条线路。';
      } else if (action === 'overload') {
        this.notice = this.selectedEdgeId ? this.engine.forceOverload(this.selectedEdgeId).message : '先点击怪物正在经过的线路。';
      } else if (action === 'pause') {
        this.engine.pause();
      } else if (action === 'restart') {
        this.selectedNodeId = undefined;
        this.selectedEdgeId = undefined;
        this.engine.restart();
      } else if (action === 'tycoon') {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'tycoon');
        window.location.assign(url);
        return;
      }
    }
    this.render(this.engine.snapshot());
  };

  private render(snapshot: BattleSnapshot): void {
    const nodes = new Map(snapshot.nodes.map((node) => [node.id, node] as const));
    const edges = new Map(snapshot.edges.map((edge) => [edge.id, edge] as const));
    const selectedNode = this.selectedNodeId ? nodeById.get(this.selectedNodeId) : undefined;
    const selectedNodeRuntime = this.selectedNodeId ? nodes.get(this.selectedNodeId) : undefined;
    const selectedEdgeRuntime = this.selectedEdgeId ? edges.get(this.selectedEdgeId) : undefined;
    const batteryPercent = snapshot.batteryCapacityMwh > 0
      ? snapshot.batteryEnergyMwh / snapshot.batteryCapacityMwh * 100
      : 0;

    const edgeMarkup = level.edges.map((edge) => {
      const runtime = edges.get(edge.id);
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!runtime || !from || !to) return '';
      const midpointX = (from.x + to.x) / 2;
      const midpointY = (from.y + to.y) / 2;
      const overloadMarker = runtime.loadState === 'overload'
        ? `<image class="battle-overload-node" href="${escapeHtml(overloadNodeSpriteUrl)}" x="${midpointX - 3.5}" y="${midpointY - 2.35}" width="7" height="4.7" preserveAspectRatio="xMidYMid meet" />`
        : '';
      return `<g data-edge-id="${edge.id}" class="battle-edge-target">
        <line class="battle-line-shadow" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
        <line class="${lineClass(runtime)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
        ${overloadMarker}
        <line class="battle-line-hit${edge.id === this.selectedEdgeId ? ' battle-line-hit--selected' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
      </g>`;
    }).join('');

    const nodeMarkup = level.nodes.map((config) => {
      const runtime = nodes.get(config.id);
      if (!runtime) return '';
      const sprite = facilitySpriteFor(config.kind);
      const showCard = config.kind !== 'junction' && !config.id.startsWith('spawn-');
      const demand = config.demandMw ?? 0;
      const status = runtime.operatingState === 'offline'
        ? '已关闭'
        : demand > 0 ? `供电 ${round(runtime.powerPercent)}%`
          : config.kind === 'generator' ? '运行中' : config.kind === 'battery' ? `储能 ${round(batteryPercent)}%` : '已接通';
      const spriteMarkup = sprite
        ? `<rect class="battle-facility-hitbox" x="${-sprite.width / 2}" y="${-sprite.height + sprite.baselineOffset}" width="${sprite.width}" height="${sprite.height}" rx="1.2" />
          <image class="battle-facility-sprite battle-facility-sprite--${config.kind}" href="${escapeHtml(sprite.url)}" x="${-sprite.width / 2}" y="${-sprite.height + sprite.baselineOffset}" width="${sprite.width}" height="${sprite.height}" preserveAspectRatio="xMidYMax meet" />`
        : '';
      const cardTransform = sprite
        ? `translate(${sprite.cardX} ${sprite.cardY})`
        : 'translate(3.1 -5.5)';
      const haloRadius = sprite ? 2.45 : 3.4;
      const markerRadius = sprite ? 1.35 : 2.05;
      return `<g class="${nodeWrapClass(runtime, config, Boolean(sprite), config.id === this.selectedNodeId)}" data-node-id="${config.id}" transform="translate(${config.x} ${config.y})">
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

    const monsterMarkup = snapshot.monsters.filter((monster) => monster.alive).map((monster) => {
      const position = monsterPosition(monster);
      const archetype = monsterById.get(monster.archetypeId);
      const sprite = monsterSpriteFor(monster.archetypeId);
      const hpRatio = clampPercent(monster.hp / Math.max(1, monster.maxHp) * 100) / 100;
      const dangerRadius = 3.4 * ((archetype?.radius ?? 8) / 8);
      const bossClass = monster.archetypeId === 'boss' ? ' battle-monster--boss' : '';
      if (sprite) {
        const hpWidth = 6 * hpRatio;
        return `<g class="battle-monster${bossClass}" transform="translate(${position.x} ${position.y})">
          <circle class="battle-monster__danger" r="${dangerRadius}" />
          <image class="battle-monster__sprite" href="${escapeHtml(sprite.url)}" x="${-sprite.width / 2}" y="${-sprite.height + 1.15}" width="${sprite.width}" height="${sprite.height}" preserveAspectRatio="xMidYMax meet" />
          <rect class="battle-monster__hp-bg" x="-3" y="${sprite.hpY}" width="6" height=".42" rx=".2" />
          <rect class="battle-monster__hp" x="-3" y="${sprite.hpY}" width="${hpWidth}" height=".42" rx=".2" />
        </g>`;
      }
      const scale = (archetype?.radius ?? 8) / 8;
      const hpWidth = 5 * hpRatio;
      return `<g class="battle-monster${bossClass}" transform="translate(${position.x} ${position.y}) scale(${scale})">
        <circle class="battle-monster__danger" r="3.4" />
        <path class="battle-monster__body" d="M-1.8 .7 L-2.5 -.6 L-1.2 -1.9 L0 -1.35 L1.2 -1.9 L2.5 -.6 L1.8 .7 L.9 1.8 L0 1.25 L-.9 1.8 Z" />
        <circle class="battle-monster__eye" cx="-.65" cy="-.25" r=".22" />
        <circle class="battle-monster__eye" cx=".65" cy="-.25" r=".22" />
        <rect class="battle-monster__hp-bg" x="-2.5" y="-3" width="5" height=".38" rx=".2" />
        <rect class="battle-monster__hp" x="-2.5" y="-3" width="${hpWidth}" height=".38" rx=".2" />
      </g>`;
    }).join('');

    const selectionText = selectedNodeRuntime
      ? `${selectedNodeRuntime.operatingState === 'online' ? '在线' : '关闭'} · ${round(selectedNodeRuntime.powerPercent)}%`
      : selectedEdgeRuntime
        ? `${round(selectedEdgeRuntime.loadPercent)}% 负载 · ${selectedEdgeRuntime.operatingState === 'online' ? '接通' : '断开'}`
        : '点击建筑或电力线路进行操作';
    const outcome = snapshot.status === 'victory' || snapshot.status === 'defeat'
      ? `<div class="battle-outcome battle-outcome--${snapshot.status}">
          <div class="battle-outcome__title">${snapshot.status === 'victory' ? '城市守住了！' : '防线失守'}</div>
          <div>${escapeHtml(snapshot.message)}</div>
          <button data-action="restart">重新挑战</button>
        </div>`
      : '';

    this.root.innerHTML = `<main class="battle-shell">
      <header class="battle-header">
        <section class="battle-brand"><h1>${escapeHtml(level.name)} <span>⚡</span></h1><p>${escapeHtml(level.subtitle)}</p></section>
        <section class="battle-meter">
          <div><b>⚡</b><span><small>当前供电</small><strong>${round(snapshot.totalAllocatedMw)} / ${round(snapshot.totalSupplyMw)} MW</strong></span></div>
          <div><b class="green">▣</b><span><small>储能</small><strong>${round(batteryPercent)}%</strong><em>${round(snapshot.batteryEnergyMwh)} / ${round(snapshot.batteryCapacityMwh)} MWh</em></span></div>
        </section>
        <section class="battle-wave"><b>☠</b><strong>第 ${Math.max(1, snapshot.currentWaveIndex)} / ${snapshot.totalWaves} 波</strong><span>${formatClock(snapshot.nextWaveInSeconds > 0 ? snapshot.nextWaveInSeconds : snapshot.elapsedSeconds)}</span></section>
        <button class="battle-pause" data-action="pause">${snapshot.status === 'paused' ? '▶' : 'Ⅱ'}</button>
      </header>

      <aside class="battle-objective">
        <h2>当前目标</h2><h3><span>✚</span> 保护医院</h3>
        <p>医院断电时间不能超过 ${round(snapshot.criticalOutageLimitSeconds)} 秒</p>
        <div class="objective-progress"><i style="width:${clampPercent(snapshot.criticalOutageSeconds / Math.max(1, snapshot.criticalOutageLimitSeconds) * 100)}%"></i></div>
        <strong>断电时间：${round(snapshot.criticalOutageSeconds)} / ${round(snapshot.criticalOutageLimitSeconds)} 秒</strong>
        <div class="objective-hint">关闭非关键区域改变怪物路线，再对经过线路强制过载。</div>
      </aside>

      <section class="battle-map"><svg viewBox="0 0 100 88" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="mapGlow"><stop offset="0" stop-color="#12384a" stop-opacity=".45"/><stop offset="1" stop-color="#02070c" stop-opacity="0"/></radialGradient></defs>
        <rect class="battle-map__base" width="100" height="88"/><ellipse class="battle-map__glow" cx="48" cy="45" rx="49" ry="41"/>
        <g>${cityBlocks()}</g><g class="battle-roads"><path d="M2 28 L98 58 M4 58 L92 16 M12 82 L88 4 M20 5 L96 40 M0 43 L78 86"/></g>
        <g>${edgeMarkup}</g><g>${nodeMarkup}</g><g>${monsterMarkup}</g>
      </svg></section>

      <section class="battle-selection"><strong>${selectedNode ? escapeHtml(selectedNode.label) : this.selectedEdgeId ? '已选择线路' : '战术控制'}</strong><span>${selectionText}</span></section>
      <nav class="battle-actions">
        <button data-action="toggle-zone" class="yellow"><b>⚡</b><strong>开关区域</strong><span>吸引或切断怪物</span></button>
        <button data-action="switch-route"><b>↝</b><strong>切换线路</strong><span>改变行进路径</span></button>
        <button data-action="overload" class="red"><b>ϟ</b><strong>强制过载</strong><span>消耗 5 MWh 电击怪物</span></button>
        <button data-action="tycoon" class="muted"><b>⌂</b><strong>旧版城市</strong><span>返回经营模式</span></button>
      </nav>
      <section class="battle-message">${escapeHtml(this.notice || snapshot.message)}</section>
      ${outcome}
    </main>`;
  }
}
