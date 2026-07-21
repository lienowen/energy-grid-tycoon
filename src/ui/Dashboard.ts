import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { GameActionResult, GameViewModel } from '../core/GameManager';
import { GameSpeed } from '../core/GameState';
import { AssetManager } from '../resources/AssetManager';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';

export interface DashboardActions {
  onBuild: (configId: string) => GameActionResult;
  onUpgrade: (instanceId: string) => GameActionResult;
  onToggleBuilding: (instanceId: string) => GameActionResult;
  onResearch: (technologyId: string) => GameActionResult;
  onPolicy: (policyId?: string) => GameActionResult;
  onSpeedChange: (speed: GameSpeed) => void;
  onPriceChange: (price: number) => void;
  onSave: () => { ok: boolean; message: string };
  onLoad: () => { ok: boolean; message: string };
  onMenu: () => void;
  onRetry: () => void;
  onNext: () => void;
}

type ControlTab = 'build' | 'research' | 'policy' | 'fleet' | 'analytics';

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);

const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(0)}`;

const escapeAttribute = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export class Dashboard {
  private notice = '';
  private lastView?: GameViewModel;
  private activeTab: ControlTab = 'build';

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: DashboardActions
  ) {}

  render(view: GameViewModel): void {
    this.lastView = view;
    const {
      state,
      level,
      availableBuildings,
      buildings,
      activeEvent,
      activePolicy,
      lastEconomy,
      lastStorage,
      goalProgress
    } = view;
    const buildingCounts = new Map<string, number>();
    for (const building of buildings) {
      buildingCounts.set(building.config.id, (buildingCounts.get(building.config.id) ?? 0) + 1);
    }

    const storageRatio = state.storageCapacity > 0 ? state.storageEnergy / state.storageCapacity : 0;
    const storageFlow = lastStorage
      ? lastStorage.discharged > 0
        ? `放电 ${formatNumber(lastStorage.discharged)} MWh`
        : lastStorage.charged > 0
          ? `充电 ${formatNumber(lastStorage.charged)} MWh`
          : '待机'
      : '待机';
    const backgroundId = level.presentation?.backgroundAssetId;
    const background = backgroundId ? this.assetUrl(backgroundId) : '';
    const accent = level.presentation?.accent ?? '#4ad7ff';
    const scenarioStyle = `--scenario-accent:${escapeAttribute(accent)};${background ? `--scenario-background:url('${escapeAttribute(background)}');` : ''}`;

    this.root.innerHTML = `
      <main class="game-shell scenario-shell" style="${scenarioStyle}">
        <header class="topbar">
          <div class="brand">
            <span class="brand-mark">${this.asset('brand_logo', 'Energy Grid Tycoon', 'brand-image')}</span>
            <div>
              <h1>ENERGY GRID TYCOON</h1>
              <p>${level.name} · 第 ${state.day} 天 ${String(Math.floor(state.hour)).padStart(2, '0')}:00</p>
            </div>
          </div>
          <div class="topbar-actions">
            <div class="session-actions">
              <button data-session="save">保存</button>
              <button data-session="load">读取</button>
              <button data-session="menu">城市列表</button>
            </div>
            <div class="speed-controls" aria-label="游戏速度">
              ${([0, 1, 2, 4] as GameSpeed[]).map((speed) => `
                <button class="speed-button ${state.speed === speed ? 'active' : ''}" data-speed="${speed}">
                  ${speed === 0 ? '暂停' : `${speed}×`}
                </button>
              `).join('')}
            </div>
          </div>
        </header>

        <section class="status-grid expanded">
          ${this.metric('资金', formatMoney(state.money), lastEconomy ? `${lastEconomy.profit >= 0 ? '+' : ''}${formatMoney(lastEconomy.profit)}/tick` : '等待结算', 'money')}
          ${this.metric('供电', `${Math.round(state.supplyRatio * 100)}%`, `${formatNumber(state.powerSupply)} / ${formatNumber(state.powerDemand)} MW`, state.supplyRatio >= 0.98 ? 'good' : 'danger')}
          ${this.metric('储能', `${Math.round(storageRatio * 100)}%`, `${formatNumber(state.storageEnergy)} / ${formatNumber(state.storageCapacity)} MWh · ${storageFlow}`, storageRatio >= 0.2 ? 'good' : 'warning')}
          ${this.metric('研发', state.researchPoints.toFixed(1), `+${view.researchPerHour.toFixed(1)} 点/小时`, 'research')}
          ${this.metric('人口', formatNumber(state.population), `满意度 ${state.satisfaction.toFixed(1)}%`, state.satisfaction >= 70 ? 'good' : 'danger')}
          ${this.metric('污染', `${state.pollution.toFixed(0)}%`, `评分 ${formatNumber(state.score)}`, state.pollution <= 25 ? 'good' : 'warning')}
        </section>

        ${this.advisor(view)}

        <section class="main-grid">
          <div class="city-panel panel">
            <div class="panel-heading">
              <div>
                <span class="eyebrow">CITY CONTROL</span>
                <h2>城市能源调度图</h2>
              </div>
              <div class="grid-status ${state.supplyRatio >= 0.98 ? 'stable' : 'unstable'}">
                ${this.asset(state.supplyRatio >= 0.98 ? 'status_stable' : 'status_warning', '电网状态', 'status-image')}
                ${state.supplyRatio >= 0.98 ? '电网稳定' : '存在缺电'}
              </div>
            </div>

            <div class="city-map scenario-city-map">
              <div class="city-core">
                <span>🏙️</span>
                <strong>${level.name}</strong>
                <small>${formatNumber(state.population)} 人</small>
              </div>
              <div class="power-ring" style="--supply:${Math.min(state.supplyRatio, 1) * 360}deg">
                <div><strong>${Math.round(Math.min(state.supplyRatio, 1) * 100)}%</strong><span>供电率</span></div>
              </div>
              <div class="storage-telemetry">
                <span>🔋 储能调度</span>
                <strong>${storageFlow}</strong>
                <div><i style="width:${Math.round(storageRatio * 100)}%"></i></div>
              </div>
              <div class="policy-telemetry">
                <span>${activePolicy ? this.asset(activePolicy.assetId, activePolicy.name, 'telemetry-image') : '⚖️'} 城市政策</span>
                <strong>${activePolicy?.name ?? '市场常态'}</strong>
              </div>
              <div class="building-fleet">
                ${availableBuildings.slice(0, 7).map((config) => this.buildingNode(config, buildingCounts.get(config.id) ?? 0)).join('')}
              </div>
            </div>

            ${activeEvent ? `
              <div class="event-banner">
                <span class="event-icon">${this.asset(`event_${activeEvent.config.id}`, activeEvent.config.name, 'event-image')}</span>
                <div>
                  <strong>${activeEvent.config.name}</strong>
                  <p>${activeEvent.config.description} · 剩余 ${Math.ceil(activeEvent.remainingHours)} 小时</p>
                </div>
              </div>
            ` : '<div class="event-banner quiet"><span>📡</span><div><strong>城市运行平稳</strong><p>调度中心正在监测负荷、天气、储能和政策效果。</p></div></div>'}
          </div>

          <aside class="control-panel panel">
            <span class="eyebrow">COMMAND CENTER</span>
            <h2>城市运营中心</h2>
            ${this.tabNavigation()}
            <div class="tab-content">
              ${this.renderTab(view, buildingCounts)}
            </div>
            ${this.goalCard(view, goalProgress)}
            ${this.notice ? `<div class="toast">${this.notice}</div>` : ''}
          </aside>
        </section>

        ${state.completed || state.failed ? this.resultOverlay(view) : ''}
      </main>
    `;

    this.bindEvents();
  }

  private tabNavigation(): string {
    const tabs: Array<[ControlTab, string]> = [
      ['build', '建设'],
      ['research', '科技'],
      ['policy', '政策'],
      ['fleet', '资产'],
      ['analytics', '数据']
    ];
    return `<nav class="control-tabs">${tabs.map(([id, label]) => `
      <button data-tab="${id}" class="${this.activeTab === id ? 'active' : ''}">${label}</button>
    `).join('')}</nav>`;
  }

  private renderTab(view: GameViewModel, buildingCounts: Map<string, number>): string {
    if (this.activeTab === 'research') return this.researchTab(view);
    if (this.activeTab === 'policy') return this.policyTab(view);
    if (this.activeTab === 'fleet') return this.fleetTab(view);
    if (this.activeTab === 'analytics') return this.analyticsTab(view);
    return this.buildTab(view, buildingCounts);
  }

  private buildTab(view: GameViewModel, buildingCounts: Map<string, number>): string {
    const { state, availableBuildings, level } = view;
    const priceRange = level.rules.powerPriceRange;
    return `
      <label class="price-control">
        <span><strong>居民电价</strong><em>${state.powerPrice.toFixed(2)} 元/kWh</em></span>
        <input id="price-slider" type="range" min="${priceRange.min}" max="${priceRange.max}" step="0.01" value="${state.powerPrice}" ${state.completed || state.failed ? 'disabled' : ''}/>
        <small>本关允许区间 ${priceRange.min.toFixed(2)}–${priceRange.max.toFixed(2)} 元/kWh；高电价提高收入，但会持续降低满意度。</small>
      </label>
      <div class="section-caption"><strong>可建设资产</strong><span>${availableBuildings.length} 种</span></div>
      <div class="build-list">
        ${availableBuildings.map((config) => this.buildCard(config, buildingCounts.get(config.id) ?? 0, state.money, state.completed || state.failed)).join('')}
      </div>
    `;
  }

  private researchTab(view: GameViewModel): string {
    const unlocked = new Set(view.state.unlockedTechnologyIds);
    const catalog = new Map(view.technologies.map((technology) => [technology.id, technology]));
    return `
      <div class="research-summary">
        <div><span>研发点</span><strong>${view.state.researchPoints.toFixed(1)}</strong></div>
        <div><span>已完成</span><strong>${unlocked.size}/${view.technologies.length}</strong></div>
        <div><span>产出</span><strong>+${view.researchPerHour.toFixed(1)}/h</strong></div>
      </div>
      <div class="tech-list">
        ${view.technologies.map((technology) => this.technologyCard(technology, unlocked, catalog, view)).join('')}
      </div>
    `;
  }

  private technologyCard(
    technology: TechnologyConfig,
    unlocked: Set<string>,
    catalog: Map<string, TechnologyConfig>,
    view: GameViewModel
  ): string {
    const complete = unlocked.has(technology.id);
    const missing = technology.prerequisites.filter((id) => !unlocked.has(id));
    const affordable = view.state.researchPoints >= technology.cost;
    const disabled = complete || missing.length > 0 || !affordable || view.state.completed || view.state.failed;
    const prerequisites = technology.prerequisites.length > 0
      ? technology.prerequisites.map((id) => catalog.get(id)?.name ?? id).join('、')
      : '无前置技术';
    const unlocks = technology.unlockBuildings?.length
      ? `解锁 ${technology.unlockBuildings.length} 项高级资产`
      : this.effectSummary(technology.effects);

    return `
      <article class="tech-card ${complete ? 'complete' : ''}">
        <span class="tech-icon">${this.asset(technology.assetId, technology.name, 'tech-image')}</span>
        <div class="tech-copy">
          <strong>${technology.name}</strong>
          <small>${technology.description}</small>
          <em>${unlocks} · 前置：${prerequisites}</em>
        </div>
        <button data-research="${technology.id}" ${disabled ? 'disabled' : ''}>
          ${complete ? '已完成' : missing.length ? '未解锁' : `${technology.cost} 点`}
        </button>
      </article>
    `;
  }

  private policyTab(view: GameViewModel): string {
    return `
      <div class="active-policy-card">
        <span>${view.activePolicy ? this.asset(view.activePolicy.assetId, view.activePolicy.name, 'policy-image') : '⚖️'}</span>
        <div><small>当前政策</small><strong>${view.activePolicy?.name ?? '市场常态'}</strong></div>
        ${view.activePolicy ? '<button data-policy="">取消政策</button>' : ''}
      </div>
      <div class="policy-list">
        ${view.policies.map((policy) => this.policyCard(policy, view)).join('')}
      </div>
    `;
  }

  private policyCard(policy: PolicyConfig, view: GameViewModel): string {
    const active = view.state.activePolicyId === policy.id;
    const disabled = active || view.state.money < policy.activationCost || view.state.completed || view.state.failed;
    return `
      <article class="policy-card ${active ? 'active' : ''}">
        <span class="policy-icon">${this.asset(policy.assetId, policy.name, 'policy-image')}</span>
        <div>
          <strong>${policy.name}</strong>
          <small>${policy.description}</small>
          <em>${this.effectSummary(policy.effects)}</em>
        </div>
        <button data-policy="${policy.id}" ${disabled ? 'disabled' : ''}>
          ${active ? '执行中' : formatMoney(policy.activationCost)}
        </button>
      </article>
    `;
  }

  private fleetTab(view: GameViewModel): string {
    if (view.buildings.length === 0) return '<div class="empty-state">城市还没有能源资产。</div>';
    return `<div class="fleet-list">${view.buildings.map((building) => this.fleetCard(building, view)).join('')}</div>`;
  }

  private fleetCard(building: BuildingBase, view: GameViewModel): string {
    const quote = view.upgradeQuotes[building.instanceId];
    const output = building.config.category === 'storage'
      ? `${formatNumber(building.storedEnergy)} / ${formatNumber(building.getStorageCapacity(view.modifiers.storageCapacityMultiplier))} MWh`
      : `${formatNumber(building.getPowerOutput(view.modifiers.generationMultiplier))} MW`;
    const canUpgrade = Boolean(quote?.available && view.state.money >= quote.cost && !view.state.completed && !view.state.failed);

    return `
      <article class="fleet-card ${building.enabled ? '' : 'offline'}">
        <span class="fleet-icon">${this.asset(building.config.assetId, building.config.name, 'fleet-image')}</span>
        <div class="fleet-copy">
          <strong>${building.config.name} <em>Lv.${building.level}</em></strong>
          <small>${output} · 维护 ${formatMoney(building.getMaintenance())}</small>
        </div>
        <div class="fleet-actions">
          <button data-toggle-building="${building.instanceId}">${building.enabled ? '停机' : '启用'}</button>
          <button class="upgrade-action" data-upgrade="${building.instanceId}" ${canUpgrade ? '' : 'disabled'}>
            ${quote?.available ? `升级 ${formatMoney(quote.cost)}` : '满级'}
          </button>
        </div>
      </article>
    `;
  }

  private analyticsTab(view: GameViewModel): string {
    const state = view.state;
    return `
      <div class="lifetime-grid">
        <div><span>累计收入</span><strong>${formatMoney(state.totalRevenue)}</strong></div>
        <div><span>累计供能</span><strong>${formatNumber(state.totalEnergyServed)} MWh</strong></div>
        <div><span>累计缺口</span><strong>${formatNumber(state.totalShortage)} MWh</strong></div>
        <div><span>当前评分</span><strong>${formatNumber(state.score)}</strong></div>
      </div>
      <div class="chart-card">
        <div class="chart-heading"><strong>最近 48 个调度周期</strong><span><i class="supply-dot"></i>供给 <i class="demand-dot"></i>需求</span></div>
        ${this.powerChart(view)}
      </div>
      <div class="modifier-grid">
        <div><span>发电效率</span><strong>${Math.round(view.modifiers.generationMultiplier * 100)}%</strong></div>
        <div><span>维护系数</span><strong>${Math.round(view.modifiers.maintenanceMultiplier * 100)}%</strong></div>
        <div><span>排放系数</span><strong>${Math.round(view.modifiers.pollutionMultiplier * 100)}%</strong></div>
        <div><span>储能容量</span><strong>${Math.round(view.modifiers.storageCapacityMultiplier * 100)}%</strong></div>
      </div>
    `;
  }

  private powerChart(view: GameViewModel): string {
    const points = view.telemetry;
    if (points.length < 2) return '<div class="empty-chart">运行两个调度周期后生成趋势图。</div>';
    const width = 640;
    const height = 180;
    const padding = 12;
    const maxValue = Math.max(1, ...points.flatMap((point) => [point.supply, point.demand]));
    const toPolyline = (key: 'supply' | 'demand'): string => points.map((point, index) => {
      const x = padding + index / Math.max(1, points.length - 1) * (width - padding * 2);
      const y = height - padding - point[key] / maxValue * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const latest = points[points.length - 1];

    return `
      <svg class="power-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="供需趋势图">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
        <polyline class="demand-line" points="${toPolyline('demand')}" />
        <polyline class="supply-line" points="${toPolyline('supply')}" />
      </svg>
      <div class="chart-latest">
        <span>最新供给 ${formatNumber(latest?.supply ?? 0)} MW</span>
        <span>最新需求 ${formatNumber(latest?.demand ?? 0)} MW</span>
        <span>本周期利润 ${formatSigned(latest?.profit ?? 0)}</span>
      </div>
    `;
  }

  private effectSummary(effects: Record<string, number | undefined>): string {
    const labels: Record<string, string> = {
      generationMultiplier: '发电',
      demandMultiplier: '需求',
      priceMultiplier: '收益',
      maintenanceMultiplier: '维护',
      satisfactionDeltaPerHour: '满意度/h',
      pollutionMultiplier: '排放',
      storageCapacityMultiplier: '储能容量',
      storageRateMultiplier: '储能功率',
      storageEfficiencyBonus: '储能效率',
      researchMultiplier: '研发'
    };
    const additive = new Set(['satisfactionDeltaPerHour', 'storageEfficiencyBonus']);
    const parts = Object.entries(effects)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => {
        const numberValue = value ?? 0;
        if (additive.has(key)) return `${labels[key] ?? key} ${numberValue >= 0 ? '+' : ''}${(numberValue * 100).toFixed(0)}%`;
        return `${labels[key] ?? key} ${Math.round(numberValue * 100)}%`;
      });
    return parts.join(' · ') || '解锁新能力';
  }

  private advisor(view: GameViewModel): string {
    const { state } = view;
    let message = '保持供电稳定可以持续获得研发点。';
    if (state.supplyRatio < 0.9) message = '当前缺电严重：建设调峰电源，或升级现有机组。';
    else if (state.storageCapacity === 0) message = '城市没有储能：白天富余电量正在被浪费。';
    else if (state.researchPoints >= 28 && state.unlockedTechnologyIds.length === 0) message = '研发点已足够：进入“科技”页完成第一项技术。';
    else if (!state.activePolicyId && state.day >= 2) message = '进入“政策”页选择城市发展方向，可改变整套经济模型。';
    return `<div class="advisor-strip"><span>🛰️ 调度顾问</span><strong>${message}</strong></div>`;
  }

  private goalCard(view: GameViewModel, goalProgress: number): string {
    const state = view.state;
    return `
      <div class="goal-card ${state.completed ? 'completed' : state.failed ? 'failed' : ''}">
        <div class="goal-copy">
          <span>当前目标</span>
          <strong>${view.level.rules.objective.label}</strong>
        </div>
        <div class="progress-track"><i style="width:${Math.round(goalProgress * 100)}%"></i></div>
        <small>${state.completed ? '任务完成，配置指定的后续城市已经解锁。' : state.failed ? view.level.rules.failure.label : `完成度 ${Math.round(goalProgress * 100)}%`}</small>
      </div>
    `;
  }

  private asset(assetId: string, alt: string, className = 'asset-image'): string {
    const value = this.assetUrl(assetId);
    if (!value || !value.startsWith('/assets/')) return value || '◆';
    return `<img class="asset-image ${className}" src="${escapeAttribute(value)}" alt="${escapeAttribute(alt)}" loading="lazy" draggable="false" />`;
  }

  private assetUrl(assetId: string): string {
    return AssetManager.get(assetId, '');
  }

  private metric(title: string, value: string, detail: string, tone: string): string {
    return `<article class="metric-card ${tone}"><span>${title}</span><strong>${value}</strong><small>${detail}</small></article>`;
  }

  private buildingNode(config: BuildingConfig, count: number): string {
    return `<div class="building-node"><span>${this.asset(config.assetId, config.name, 'node-image')}</span><strong>${config.name}</strong><small>× ${count}</small></div>`;
  }

  private buildCard(config: BuildingConfig, count: number, money: number, gameEnded: boolean): string {
    const disabled = money < config.cost || gameEnded;
    const output = config.category === 'storage'
      ? `${formatNumber(config.capacity ?? 0)} MWh · ${Math.round((config.efficiency ?? 0.9) * 100)}%效率`
      : `${formatNumber(config.power)} MW`;

    return `
      <button class="build-card" data-build="${config.id}" ${disabled ? 'disabled' : ''}>
        <span class="build-icon">${this.asset(config.assetId, config.name, 'build-image')}</span>
        <span class="build-copy"><strong>${config.name}</strong><small>${config.description}</small><em>${output} · 维护 ${formatMoney(config.maintenance)}</em></span>
        <span class="build-price">${formatMoney(config.cost)}<small>已有 ${count}</small></span>
      </button>
    `;
  }

  private resultOverlay(view: GameViewModel): string {
    const completed = view.state.completed;
    return `
      <div class="result-backdrop">
        <section class="result-dialog ${completed ? 'success' : 'failure'}">
          <span class="result-icon">${completed ? '🏆' : this.asset('status_warning', '运营失败', 'result-status-image')}</span>
          <span class="eyebrow">${completed ? 'CITY SECURED' : 'GRID COLLAPSED'}</span>
          <h2>${completed ? '城市运营成功' : '城市运营失败'}</h2>
          <p>${completed ? `你完成了“${view.level.rules.objective.label}”，战役进度已经更新。` : view.level.rules.failure.label}</p>
          <div class="result-stats">
            <span>第 ${view.state.day} 天</span>
            <span>评分 ${formatNumber(view.state.score)}</span>
            <span>研发 ${view.state.unlockedTechnologyIds.length} 项</span>
            <span>资金 ${formatMoney(view.state.money)}</span>
          </div>
          <div class="result-actions">
            <button class="secondary-action" data-result="menu">城市列表</button>
            <button class="secondary-action" data-result="retry">重新挑战</button>
            ${completed && view.level.progression.nextLevelId ? '<button class="primary-action" data-result="next">进入下一城</button>' : ''}
          </div>
        </section>
      </div>
    `;
  }

  private showNotice(message: string): void {
    this.notice = message;
    if (this.lastView) this.render(this.lastView);
    window.setTimeout(() => {
      this.notice = '';
      if (this.lastView) this.render(this.lastView);
    }, 1800);
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        this.activeTab = button.dataset.tab as ControlTab;
        if (this.lastView) this.render(this.lastView);
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      button.addEventListener('click', () => this.actions.onSpeedChange(Number(button.dataset.speed) as GameSpeed));
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-build]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onBuild(button.dataset.build ?? '');
        this.showNotice(result.ok ? '建设指令已下达' : result.reason ?? '建设失败');
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-research]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onResearch(button.dataset.research ?? '');
        this.showNotice(result.ok ? '技术研发完成' : result.reason ?? '研发失败');
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-policy]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onPolicy(button.dataset.policy || undefined);
        this.showNotice(result.ok ? '城市政策已更新' : result.reason ?? '政策执行失败');
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onUpgrade(button.dataset.upgrade ?? '');
        this.showNotice(result.ok ? '建筑升级完成' : result.reason ?? '升级失败');
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-toggle-building]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onToggleBuilding(button.dataset.toggleBuilding ?? '');
        this.showNotice(result.ok ? '机组状态已切换' : result.reason ?? '操作失败');
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-session]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.session;
        if (action === 'save') this.showNotice(this.actions.onSave().message);
        if (action === 'load') {
          const result = this.actions.onLoad();
          if (!result.ok) this.showNotice(result.message);
        }
        if (action === 'menu') this.actions.onMenu();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-result]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.result === 'menu') this.actions.onMenu();
        if (button.dataset.result === 'retry') this.actions.onRetry();
        if (button.dataset.result === 'next') this.actions.onNext();
      });
    });

    const price = this.root.querySelector<HTMLInputElement>('#price-slider');
    price?.addEventListener('change', () => this.actions.onPriceChange(Number(price.value)));
  }
}
