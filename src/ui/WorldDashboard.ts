import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { GameActionResult, GameViewModel } from '../core/GameManager';
import type { GameSpeed } from '../core/GameState';
import { AssetManager } from '../resources/AssetManager';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { renderWorldScene } from './world/WorldSceneRenderer';

export interface WorldDashboardActions {
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

type WorldPanel = 'none' | 'market' | 'research' | 'policy' | 'fleet' | 'analytics' | 'system';

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

const panelLabels: Record<Exclude<WorldPanel, 'none'>, string> = {
  market: '电价与调度',
  research: '能源科技',
  policy: '城市政策',
  fleet: '机组资产',
  analytics: '运行情报',
  system: '系统菜单'
};

export class WorldDashboard {
  private notice = '';
  private lastView?: GameViewModel;
  private activePanel: WorldPanel = 'none';
  private noticeTimer?: number;
  private active = true;

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: WorldDashboardActions
  ) {}

  destroy(): void {
    this.active = false;
    this.lastView = undefined;
    if (this.noticeTimer !== undefined) window.clearTimeout(this.noticeTimer);
    this.noticeTimer = undefined;
  }

  render(view: GameViewModel): void {
    if (!this.active) return;
    this.lastView = view;
    const { state, level, buildings, availableBuildings, lastEconomy } = view;
    const buildingCounts = new Map<string, number>();
    for (const building of buildings) {
      buildingCounts.set(building.config.id, (buildingCounts.get(building.config.id) ?? 0) + 1);
    }

    const backgroundId = level.presentation?.backgroundAssetId;
    const background = backgroundId ? AssetManager.get(backgroundId, '') : '';
    const accent = level.presentation?.accent ?? '#4ad7ff';
    const shellStyle = [
      `--scenario-accent:${escapeAttribute(accent)}`,
      background ? `--world-background:url('${escapeAttribute(background)}')` : ''
    ].filter(Boolean).join(';');

    this.root.innerHTML = `
      <main class="world-game" style="${shellStyle}">
        ${this.renderHud(view, lastEconomy?.profit)}
        <div class="world-viewport">
          ${renderWorldScene({
            view,
            buildingCounts,
            asset: (assetId, alt, className) => this.asset(assetId, alt, className)
          })}
          ${this.renderAdvisor(view)}
          ${this.renderQuickRail(view)}
          ${this.renderBuildDock(view, availableBuildings, buildingCounts)}
          ${this.activePanel !== 'none' ? this.renderPanel(view) : ''}
          ${this.notice ? `<div class="world-toast">${this.notice}</div>` : ''}
        </div>
        ${state.completed || state.failed ? this.renderResult(view) : ''}
      </main>
    `;

    this.bindEvents();
  }

  private renderHud(view: GameViewModel, profit?: number): string {
    const { state, level } = view;
    const time = `${String(Math.floor(state.hour)).padStart(2, '0')}:00`;
    const supplyTone = state.supplyRatio >= 0.98 ? 'good' : state.supplyRatio >= 0.9 ? 'warn' : 'danger';
    return `
      <header class="world-hud">
        <div class="world-brand">
          <span>${this.asset('brand_logo', 'Energy Grid Tycoon', 'world-brand-image')}</span>
          <div><strong>${level.name}</strong><small>第 ${state.day} 天 · ${time}</small></div>
        </div>

        <div class="world-hud-vitals">
          <div class="hud-vital money"><small>资金</small><strong>${formatMoney(state.money)}</strong><span>${profit === undefined ? '等待结算' : `${formatSigned(profit)} / 周期`}</span></div>
          <div class="hud-vital ${supplyTone}"><small>电网</small><strong>${Math.round(state.supplyRatio * 100)}%</strong><span>${formatNumber(state.powerSupply)} / ${formatNumber(state.powerDemand)} MW</span></div>
          <div class="hud-vital"><small>人口</small><strong>${formatNumber(state.population)}</strong><span>满意度 ${state.satisfaction.toFixed(0)}%</span></div>
          <div class="hud-vital pollution"><small>环境</small><strong>${state.pollution.toFixed(0)}%</strong><span>研发 ${state.researchPoints.toFixed(1)}</span></div>
        </div>

        <div class="world-time-controls" aria-label="游戏速度">
          ${([0, 1, 2, 4] as GameSpeed[]).map((speed) => `
            <button class="world-speed ${state.speed === speed ? 'active' : ''}" data-speed="${speed}">
              ${speed === 0 ? 'Ⅱ' : `${speed}×`}
            </button>
          `).join('')}
        </div>
      </header>
    `;
  }

  private renderAdvisor(view: GameViewModel): string {
    const { state } = view;
    let title = '调度建议';
    let message = '保持供电稳定，城市会持续积累研发能力。';
    let tone = 'calm';
    if (state.supplyRatio < 0.9) {
      title = '电力告急';
      message = '立刻建设调峰电源、启用停机机组，或降低负荷压力。';
      tone = 'danger';
    } else if (state.storageCapacity === 0) {
      message = '建设储能，把低谷富余电力留给晚高峰。';
      tone = 'warn';
    } else if (state.researchPoints >= 28 && state.unlockedTechnologyIds.length === 0) {
      message = '研发点已经足够，打开科技面板解锁第一项能力。';
      tone = 'research';
    } else if (!state.activePolicyId && state.day >= 2) {
      message = '选择城市政策，明确收入、居民或绿色发展的方向。';
    }
    return `<aside class="world-advisor ${tone}"><i></i><div><strong>${title}</strong><span>${message}</span></div></aside>`;
  }

  private renderQuickRail(view: GameViewModel): string {
    const items: Array<[Exclude<WorldPanel, 'none'>, string, string]> = [
      ['market', '电价', '⌁'],
      ['research', `科技 ${view.state.unlockedTechnologyIds.length}/${view.technologies.length}`, '⌬'],
      ['policy', view.activePolicy?.name ?? '政策', '◆'],
      ['fleet', `资产 ${view.buildings.length}`, '▦'],
      ['analytics', '情报', '⌁'],
      ['system', '菜单', '⋯']
    ];
    return `
      <nav class="world-quick-rail" aria-label="城市操作">
        ${items.map(([panel, label, glyph]) => `
          <button data-panel="${panel}" class="${this.activePanel === panel ? 'active' : ''}" aria-label="打开${panelLabels[panel]}">
            <i>${glyph}</i><span>${label}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  private renderBuildDock(
    view: GameViewModel,
    configs: readonly BuildingConfig[],
    counts: ReadonlyMap<string, number>
  ): string {
    const ended = view.state.completed || view.state.failed;
    return `
      <section class="world-build-dock" aria-label="建设工具栏">
        <div class="dock-heading"><span>建设</span><small>选择资产后立即部署</small></div>
        <div class="dock-tools">
          ${configs.map((config) => {
            const disabled = ended || view.state.money < config.cost;
            const count = counts.get(config.id) ?? 0;
            const output = config.category === 'storage'
              ? `${formatNumber(config.capacity ?? 0)} MWh`
              : `${formatNumber(config.power)} MW`;
            return `
              <button class="dock-tool" data-build="${config.id}" ${disabled ? 'disabled' : ''}>
                <span class="dock-tool-art">${this.asset(config.assetId, config.name, 'dock-building-image')}</span>
                <span class="dock-tool-copy"><strong>${config.name}</strong><small>${output} · 已有 ${count}</small></span>
                <em>${formatMoney(config.cost)}</em>
                <span class="dock-tooltip">${config.description}</span>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  private renderPanel(view: GameViewModel): string {
    return `
      <div class="world-drawer-backdrop" data-panel-close="true"></div>
      <aside class="world-drawer" aria-label="${panelLabels[this.activePanel as Exclude<WorldPanel, 'none'>]}">
        <header>
          <div><span>COMMAND</span><strong>${panelLabels[this.activePanel as Exclude<WorldPanel, 'none'>]}</strong></div>
          <button data-panel-close="true" aria-label="关闭面板">×</button>
        </header>
        <div class="world-drawer-body">${this.renderPanelBody(view)}</div>
      </aside>
    `;
  }

  private renderPanelBody(view: GameViewModel): string {
    if (this.activePanel === 'research') return this.renderResearch(view);
    if (this.activePanel === 'policy') return this.renderPolicy(view);
    if (this.activePanel === 'fleet') return this.renderFleet(view);
    if (this.activePanel === 'analytics') return this.renderAnalytics(view);
    if (this.activePanel === 'system') return this.renderSystem();
    return this.renderMarket(view);
  }

  private renderMarket(view: GameViewModel): string {
    const range = view.level.rules.powerPriceRange;
    return `
      <section class="drawer-section market-console">
        <div class="drawer-hero-stat">
          <small>居民电价</small>
          <strong>${view.state.powerPrice.toFixed(2)} <span>元/kWh</span></strong>
          <p>抬高电价能提高收入，但会持续侵蚀居民满意度。</p>
        </div>
        <label class="world-price-control">
          <input id="world-price-slider" type="range" min="${range.min}" max="${range.max}" step="0.01" value="${view.state.powerPrice}" ${view.state.completed || view.state.failed ? 'disabled' : ''}/>
          <span><i>${range.min.toFixed(2)}</i><i>${range.max.toFixed(2)}</i></span>
        </label>
        <div class="drawer-stat-grid">
          <div><small>供给</small><strong>${formatNumber(view.state.powerSupply)} MW</strong></div>
          <div><small>需求</small><strong>${formatNumber(view.state.powerDemand)} MW</strong></div>
          <div><small>储能</small><strong>${formatNumber(view.state.storageEnergy)} MWh</strong></div>
          <div><small>满意度</small><strong>${view.state.satisfaction.toFixed(1)}%</strong></div>
        </div>
      </section>
    `;
  }

  private renderResearch(view: GameViewModel): string {
    const unlocked = new Set(view.state.unlockedTechnologyIds);
    const catalog = new Map(view.technologies.map((technology) => [technology.id, technology]));
    return `
      <div class="drawer-summary"><span>研发点 <strong>${view.state.researchPoints.toFixed(1)}</strong></span><span>产出 <strong>+${view.researchPerHour.toFixed(1)}/h</strong></span></div>
      <div class="world-card-grid tech-grid">
        ${view.technologies.map((technology) => this.renderTechnologyCard(technology, unlocked, catalog, view)).join('')}
      </div>
    `;
  }

  private renderTechnologyCard(
    technology: TechnologyConfig,
    unlocked: ReadonlySet<string>,
    catalog: ReadonlyMap<string, TechnologyConfig>,
    view: GameViewModel
  ): string {
    const complete = unlocked.has(technology.id);
    const missing = technology.prerequisites.filter((id) => !unlocked.has(id));
    const disabled = complete || missing.length > 0 || view.state.researchPoints < technology.cost || view.state.completed || view.state.failed;
    const prerequisite = technology.prerequisites.length
      ? technology.prerequisites.map((id) => catalog.get(id)?.name ?? id).join('、')
      : '无前置科技';
    return `
      <article class="world-choice-card ${complete ? 'complete' : ''}">
        <span class="world-choice-art">${this.asset(technology.assetId, technology.name, 'drawer-tech-image')}</span>
        <div><strong>${technology.name}</strong><small>${technology.description}</small><em>${this.effectSummary(technology.effects)}</em><span>前置：${prerequisite}</span></div>
        <button data-research="${technology.id}" ${disabled ? 'disabled' : ''}>${complete ? '已掌握' : missing.length ? '未解锁' : `${technology.cost} 点`}</button>
      </article>
    `;
  }

  private renderPolicy(view: GameViewModel): string {
    return `
      <div class="drawer-summary policy-current">
        <span>当前方向 <strong>${view.activePolicy?.name ?? '市场常态'}</strong></span>
        ${view.activePolicy ? '<button data-policy="">结束政策</button>' : ''}
      </div>
      <div class="world-card-grid policy-grid">
        ${view.policies.map((policy) => this.renderPolicyCard(policy, view)).join('')}
      </div>
    `;
  }

  private renderPolicyCard(policy: PolicyConfig, view: GameViewModel): string {
    const active = view.state.activePolicyId === policy.id;
    const disabled = active || view.state.money < policy.activationCost || view.state.completed || view.state.failed;
    return `
      <article class="world-choice-card policy-choice ${active ? 'active' : ''}">
        <span class="world-choice-art">${this.asset(policy.assetId, policy.name, 'drawer-policy-image')}</span>
        <div><strong>${policy.name}</strong><small>${policy.description}</small><em>${this.effectSummary(policy.effects)}</em></div>
        <button data-policy="${policy.id}" ${disabled ? 'disabled' : ''}>${active ? '执行中' : formatMoney(policy.activationCost)}</button>
      </article>
    `;
  }

  private renderFleet(view: GameViewModel): string {
    if (view.buildings.length === 0) return '<div class="world-empty-state">城市还没有能源资产。</div>';
    return `<div class="world-fleet-list">${view.buildings.map((building) => this.renderFleetCard(building, view)).join('')}</div>`;
  }

  private renderFleetCard(building: BuildingBase, view: GameViewModel): string {
    const quote = view.upgradeQuotes[building.instanceId];
    const output = building.config.category === 'storage'
      ? `${formatNumber(building.storedEnergy)} / ${formatNumber(building.getStorageCapacity(view.modifiers.storageCapacityMultiplier))} MWh`
      : `${formatNumber(building.getPowerOutput(view.modifiers.generationMultiplier))} MW`;
    const canUpgrade = Boolean(quote?.available && view.state.money >= quote.cost && !view.state.completed && !view.state.failed);
    return `
      <article class="world-fleet-card ${building.enabled ? '' : 'offline'}">
        <span>${this.asset(building.config.assetId, building.config.name, 'drawer-fleet-image')}</span>
        <div><strong>${building.config.name} <i>Lv.${building.level}</i></strong><small>${output} · 维护 ${formatMoney(building.getMaintenance())}</small></div>
        <div>
          <button data-toggle-building="${building.instanceId}">${building.enabled ? '停机' : '启动'}</button>
          <button class="upgrade" data-upgrade="${building.instanceId}" ${canUpgrade ? '' : 'disabled'}>${quote?.available ? `升级 ${formatMoney(quote.cost)}` : '满级'}</button>
        </div>
      </article>
    `;
  }

  private renderAnalytics(view: GameViewModel): string {
    return `
      <div class="drawer-stat-grid analytics-summary">
        <div><small>累计收入</small><strong>${formatMoney(view.state.totalRevenue)}</strong></div>
        <div><small>累计供能</small><strong>${formatNumber(view.state.totalEnergyServed)} MWh</strong></div>
        <div><small>累计缺口</small><strong>${formatNumber(view.state.totalShortage)} MWh</strong></div>
        <div><small>城市评分</small><strong>${formatNumber(view.state.score)}</strong></div>
      </div>
      <section class="world-chart-card"><header><strong>最近 48 个调度周期</strong><span>供给 / 需求</span></header>${this.renderPowerChart(view)}</section>
      <div class="drawer-stat-grid modifier-summary">
        <div><small>发电效率</small><strong>${Math.round(view.modifiers.generationMultiplier * 100)}%</strong></div>
        <div><small>维护系数</small><strong>${Math.round(view.modifiers.maintenanceMultiplier * 100)}%</strong></div>
        <div><small>排放系数</small><strong>${Math.round(view.modifiers.pollutionMultiplier * 100)}%</strong></div>
        <div><small>储能容量</small><strong>${Math.round(view.modifiers.storageCapacityMultiplier * 100)}%</strong></div>
      </div>
    `;
  }

  private renderSystem(): string {
    return `
      <div class="world-system-menu">
        <button data-session="save"><strong>保存城市</strong><span>记录当前模拟状态与随机种子</span></button>
        <button data-session="load"><strong>读取存档</strong><span>恢复最近一次城市进度</span></button>
        <button data-session="menu"><strong>返回城市列表</strong><span>结束当前视图并选择其他关卡</span></button>
      </div>
    `;
  }

  private renderPowerChart(view: GameViewModel): string {
    const points = view.telemetry;
    if (points.length < 2) return '<div class="world-empty-chart">运行两个调度周期后生成趋势。</div>';
    const width = 720;
    const height = 220;
    const padding = 18;
    const maxValue = Math.max(1, ...points.flatMap((point) => [point.supply, point.demand]));
    const line = (key: 'supply' | 'demand'): string => points.map((point, index) => {
      const x = padding + index / Math.max(1, points.length - 1) * (width - padding * 2);
      const y = height - padding - point[key] / maxValue * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const latest = points.at(-1);
    return `
      <svg class="world-power-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="供需趋势图">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
        <polyline class="demand" points="${line('demand')}" />
        <polyline class="supply" points="${line('supply')}" />
      </svg>
      <footer><span>供给 ${formatNumber(latest?.supply ?? 0)} MW</span><span>需求 ${formatNumber(latest?.demand ?? 0)} MW</span><span>利润 ${formatSigned(latest?.profit ?? 0)}</span></footer>
    `;
  }

  private renderResult(view: GameViewModel): string {
    const complete = view.state.completed;
    return `
      <div class="world-result-backdrop">
        <section class="world-result ${complete ? 'success' : 'failure'}">
          <span class="world-result-mark">${complete ? '★' : this.asset('status_warning', '运营失败', 'world-result-image')}</span>
          <small>${complete ? 'CITY SECURED' : 'GRID COLLAPSED'}</small>
          <h2>${complete ? '城市能源网络已稳定' : '城市运营失败'}</h2>
          <p>${complete ? `你完成了“${view.level.rules.objective.label}”。` : view.level.rules.failure.label}</p>
          <div><span>第 ${view.state.day} 天</span><span>评分 ${formatNumber(view.state.score)}</span><span>资金 ${formatMoney(view.state.money)}</span></div>
          <footer>
            <button data-result="menu">城市列表</button>
            <button data-result="retry">重新挑战</button>
            ${complete && view.level.progression.nextLevelId ? '<button class="primary" data-result="next">前往下一城</button>' : ''}
          </footer>
        </section>
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
        return additive.has(key)
          ? `${labels[key] ?? key} ${numberValue >= 0 ? '+' : ''}${(numberValue * 100).toFixed(0)}%`
          : `${labels[key] ?? key} ${Math.round(numberValue * 100)}%`;
      });
    return parts.join(' · ') || '解锁新能力';
  }

  private asset(assetId: string, alt: string, className = 'world-asset-image'): string {
    const value = AssetManager.get(assetId, '');
    if (!value || !value.startsWith('/')) return `<span class="world-asset-fallback" aria-label="${escapeAttribute(alt)}">◇</span>`;
    return `<img class="world-asset-image ${className}" src="${escapeAttribute(value)}" alt="${escapeAttribute(alt)}" loading="lazy" draggable="false" data-asset-fallback="◇" />`;
  }

  private showNotice(message: string): void {
    this.notice = message;
    if (this.noticeTimer !== undefined) window.clearTimeout(this.noticeTimer);
    if (this.lastView) this.render(this.lastView);
    this.noticeTimer = window.setTimeout(() => {
      this.notice = '';
      if (this.active && this.lastView) this.render(this.lastView);
    }, 1800);
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.dataset.panel as WorldPanel;
        this.activePanel = this.activePanel === panel ? 'none' : panel;
        if (this.lastView) this.render(this.lastView);
      });
    });
    this.root.querySelectorAll<HTMLElement>('[data-panel-close]').forEach((element) => {
      element.addEventListener('click', () => {
        this.activePanel = 'none';
        if (this.lastView) this.render(this.lastView);
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      button.addEventListener('click', () => this.actions.onSpeedChange(Number(button.dataset.speed) as GameSpeed));
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-build]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onBuild(button.dataset.build ?? '');
        this.showNotice(result.ok ? '建设完成，资产已接入电网' : result.reason ?? '建设失败');
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-research]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onResearch(button.dataset.research ?? '');
        this.showNotice(result.ok ? '新科技已投入城市运行' : result.reason ?? '研发失败');
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-policy]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onPolicy(button.dataset.policy || undefined);
        this.showNotice(result.ok ? '城市政策已经切换' : result.reason ?? '政策执行失败');
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onUpgrade(button.dataset.upgrade ?? '');
        this.showNotice(result.ok ? '机组升级完成' : result.reason ?? '升级失败');
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-toggle-building]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onToggleBuilding(button.dataset.toggleBuilding ?? '');
        this.showNotice(result.ok ? '机组运行状态已切换' : result.reason ?? '操作失败');
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
    this.root.querySelectorAll<HTMLImageElement>('img[data-asset-fallback]').forEach((image) => {
      image.addEventListener('error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'world-asset-fallback';
        fallback.textContent = image.dataset.assetFallback ?? '◇';
        image.replaceWith(fallback);
      }, { once: true });
    });
    const price = this.root.querySelector<HTMLInputElement>('#world-price-slider');
    price?.addEventListener('change', () => this.actions.onPriceChange(Number(price.value)));
  }
}
