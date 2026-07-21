import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { GameActionResult, GameViewModel } from '../core/GameManager';
import type { GameSpeed } from '../core/GameState';
import { AssetManager } from '../resources/AssetManager';
import {
  MayorGuidanceSystem,
  type MayorGuideAction,
  type MayorGuidePanel
} from '../systems/MayorGuidanceSystem';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { renderWorldScene } from './world/WorldSceneRenderer';

export interface MayorDashboardActions {
  onBuild: (configId: string, plotId?: string) => GameActionResult;
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

type MayorPanel = MayorGuidePanel | 'system' | 'none';

const panelLabels: Record<Exclude<MayorPanel, 'none'>, string> = {
  market: '居民用电',
  research: '城市发展',
  policy: '发展方向',
  fleet: '城市设施',
  analytics: '城市情况',
  system: '游戏设置'
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);

const escapeAttribute = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export class MayorDashboard {
  private notice = '';
  private lastView?: GameViewModel;
  private activePanel: MayorPanel = 'none';
  private selectedBuildingId?: string;
  private focusedBuildingId?: string;
  private noticeTimer?: number;
  private active = true;

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: MayorDashboardActions
  ) {}

  destroy(): void {
    this.active = false;
    this.lastView = undefined;
    if (this.noticeTimer !== undefined) window.clearTimeout(this.noticeTimer);
  }

  render(view: GameViewModel): void {
    if (!this.active) return;
    this.lastView = view;
    if (
      this.selectedBuildingId
      && !view.availableBuildings.some((building) => building.id === this.selectedBuildingId)
    ) {
      this.selectedBuildingId = undefined;
    }

    const counts = new Map<string, number>();
    for (const building of view.buildings) {
      counts.set(building.config.id, (counts.get(building.config.id) ?? 0) + 1);
    }

    const backgroundId = view.level.presentation?.backgroundAssetId;
    const background = backgroundId ? AssetManager.get(backgroundId, '') : '';
    const accent = view.level.presentation?.accent ?? '#4ad7ff';
    const style = [
      `--scenario-accent:${escapeAttribute(accent)}`,
      background ? `--world-background:url('${escapeAttribute(background)}')` : ''
    ].filter(Boolean).join(';');

    this.root.innerHTML = `
      <main class="mayor-game player-city-game" style="${style}">
        ${this.renderTopBar(view)}
        <div class="mayor-world">
          ${renderWorldScene({
            view,
            asset: (id, alt, className) => this.asset(id, alt, className),
            selectedBuildingId: this.selectedBuildingId
          })}
          ${this.renderGuidance(view)}
          ${this.renderMenuRail(view)}
          ${this.renderBuildBar(view, counts)}
          ${this.activePanel !== 'none' ? this.renderDrawer(view) : ''}
          ${this.notice ? `<div class="mayor-toast">${this.notice}</div>` : ''}
        </div>
        ${view.state.completed || view.state.failed ? this.renderResult(view) : ''}
      </main>
    `;

    this.bindEvents();
  }

  private renderTopBar(view: GameViewModel): string {
    const { state, level, lastEconomy } = view;
    const time = `${String(Math.floor(state.hour)).padStart(2, '0')}:00`;
    const lights = Math.round(Math.min(1, state.supplyRatio) * 100);
    return `
      <header class="mayor-topbar">
        <div class="mayor-city-name">
          <span>${this.asset('brand_logo', level.name, 'mayor-brand-image')}</span>
          <div><strong>${level.name}</strong><small>第 ${state.day} 天 · ${time}</small></div>
        </div>
        <div class="mayor-vitals">
          <div><small>城市资金</small><strong>${formatMoney(state.money)}</strong><span>${lastEconomy ? `${lastEconomy.profit >= 0 ? '刚刚赚到' : '刚刚花掉'} ${formatMoney(Math.abs(lastEconomy.profit))}` : '城市正在开始运转'}</span></div>
          <div class="${lights >= 98 ? 'good' : lights >= 90 ? 'warn' : 'danger'}"><small>正常用电</small><strong>${lights}%</strong><span>${lights >= 98 ? '所有街区都有电' : '有街区正在缺电'}</span></div>
          <div><small>居民</small><strong>${formatNumber(state.population)}</strong><span>${state.satisfaction.toFixed(0)}% 感到满意</span></div>
          <div class="${state.pollution <= 28 ? 'good' : state.pollution >= 65 ? 'danger' : 'warn'}"><small>环境压力</small><strong>${state.pollution.toFixed(0)}%</strong><span>${state.researchPoints.toFixed(1)} 发展点</span></div>
        </div>
        <div class="mayor-clock" aria-label="时间速度">
          ${([0, 1, 2, 4] as GameSpeed[]).map((speed) => `
            <button data-speed="${speed}" class="${state.speed === speed ? 'active' : ''}">${speed === 0 ? '暂停' : `${speed}×`}</button>
          `).join('')}
        </div>
      </header>
    `;
  }

  private renderGuidance(view: GameViewModel): string {
    if (this.selectedBuildingId) return '';
    const guide = MayorGuidanceSystem.evaluate({
      state: view.state,
      buildings: view.buildings,
      availableBuildings: view.availableBuildings,
      technologies: view.technologies,
      activePolicyId: view.state.activePolicyId,
      briefing: view.level.presentation?.briefing,
      goalProgress: view.goalProgress
    });
    return `
      <aside class="mayor-guide ${guide.tone} player-next-step">
        <span class="mayor-guide-person"><i></i><b>下一步</b></span>
        <div class="mayor-guide-copy">
          <strong>${guide.headline}</strong>
          <p>${guide.message}</p>
          <small>${guide.consequence}</small>
        </div>
        <button ${this.guideActionAttributes(guide.action)}>${guide.actionLabel}</button>
      </aside>
    `;
  }

  private guideActionAttributes(action: MayorGuideAction): string {
    if (action.type === 'build') return `data-guide-build="${escapeAttribute(action.buildingId)}"`;
    if (action.type === 'openPanel') return `data-guide-panel="${action.panel}"`;
    return 'data-speed="1"';
  }

  private renderMenuRail(view: GameViewModel): string {
    const items: Array<[Exclude<MayorPanel, 'none'>, string]> = [
      ['market', '用电'],
      ['research', `发展 ${view.state.unlockedTechnologyIds.length}/${view.technologies.length}`],
      ['policy', '方向'],
      ['fleet', `设施 ${view.buildings.length}`],
      ['analytics', '城市'],
      ['system', '设置']
    ];
    return `<nav class="mayor-menu-rail player-tool-rail" aria-label="城市工具">${items.map(([panel, label]) => `
      <button data-panel="${panel}" class="${this.activePanel === panel ? 'active' : ''}"><i></i><span>${label}</span></button>
    `).join('')}</nav>`;
  }

  private renderBuildBar(view: GameViewModel, counts: ReadonlyMap<string, number>): string {
    const ended = view.state.completed || view.state.failed;
    return `
      <section class="mayor-build-bar player-build-bar">
        <div class="mayor-build-title"><strong>选择建设项目</strong><small>${this.selectedBuildingId ? '再点击地图上发亮的地块' : '选中项目后放到城市里'}</small></div>
        <div class="mayor-build-options">
          ${view.availableBuildings.map((config) => {
            const disabled = ended || view.state.money < config.cost;
            const ability = config.category === 'storage'
              ? `保存 ${formatNumber(config.capacity ?? 0)} 份电`
              : `增加 ${formatNumber(config.power)} MW`;
            const selected = this.selectedBuildingId === config.id;
            return `
              <button data-select-build="${config.id}" class="${selected ? 'selected' : ''}" ${disabled ? 'disabled' : ''}>
                <span>${this.asset(config.assetId, config.name, 'mayor-build-image')}</span>
                <div><strong>${config.name}</strong><small>${ability} · 已有 ${counts.get(config.id) ?? 0}</small></div>
                <em>${formatMoney(config.cost)}</em>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  private renderDrawer(view: GameViewModel): string {
    const panel = this.activePanel as Exclude<MayorPanel, 'none'>;
    return `
      <div class="mayor-drawer-shade" data-panel-close="true"></div>
      <aside class="mayor-drawer">
        <header><div><small>城市工具</small><strong>${panelLabels[panel]}</strong></div><button data-panel-close="true">×</button></header>
        <div class="mayor-drawer-body">${this.renderDrawerBody(view)}</div>
      </aside>
    `;
  }

  private renderDrawerBody(view: GameViewModel): string {
    if (this.activePanel === 'research') return this.renderUpgrades(view);
    if (this.activePanel === 'policy') return this.renderPolicies(view);
    if (this.activePanel === 'fleet') return this.renderFacilities(view);
    if (this.activePanel === 'analytics') return this.renderCityReport(view);
    if (this.activePanel === 'system') return this.renderOffice();
    return this.renderResidentPower(view);
  }

  private renderResidentPower(view: GameViewModel): string {
    const range = view.level.rules.powerPriceRange;
    return `
      <section class="mayor-decision-intro">
        <small>居民每度电价格</small>
        <strong>${view.state.powerPrice.toFixed(2)} 元</strong>
        <p>价格高，城市收入更多；价格太高，居民会越来越不满意。</p>
      </section>
      <label class="mayor-price-slider">
        <span><b>居民负担更轻</b><b>城市收入更多</b></span>
        <input id="mayor-price" type="range" min="${range.min}" max="${range.max}" step="0.01" value="${view.state.powerPrice}" ${view.state.completed || view.state.failed ? 'disabled' : ''}/>
      </label>
      <div class="mayor-simple-grid">
        <div><small>城市能提供</small><strong>${formatNumber(view.state.powerSupply)} MW</strong></div>
        <div><small>居民正需要</small><strong>${formatNumber(view.state.powerDemand)} MW</strong></div>
        <div><small>备用电</small><strong>${formatNumber(view.state.storageEnergy)} MWh</strong></div>
        <div><small>居民满意</small><strong>${view.state.satisfaction.toFixed(1)}%</strong></div>
      </div>
    `;
  }

  private renderUpgrades(view: GameViewModel): string {
    const unlocked = new Set(view.state.unlockedTechnologyIds);
    const catalog = new Map(view.technologies.map((item) => [item.id, item]));
    return `
      <div class="mayor-panel-summary"><span>可用发展点 <strong>${view.state.researchPoints.toFixed(1)}</strong></span><span>每小时增加 <strong>${view.researchPerHour.toFixed(1)}</strong></span></div>
      <div class="mayor-choice-list">${view.technologies.map((technology) => this.technologyChoice(technology, unlocked, catalog, view)).join('')}</div>
    `;
  }

  private technologyChoice(
    technology: TechnologyConfig,
    unlocked: ReadonlySet<string>,
    catalog: ReadonlyMap<string, TechnologyConfig>,
    view: GameViewModel
  ): string {
    const done = unlocked.has(technology.id);
    const missing = technology.prerequisites.filter((id) => !unlocked.has(id));
    const disabled = done || missing.length > 0 || technology.cost > view.state.researchPoints || view.state.completed || view.state.failed;
    const needs = missing.length ? `先完成：${missing.map((id) => catalog.get(id)?.name ?? id).join('、')}` : '现在可以选择';
    return `
      <article class="mayor-choice ${done ? 'active' : ''}">
        <span>${this.asset(technology.assetId, technology.name, 'mayor-choice-image')}</span>
        <div><strong>${technology.name}</strong><p>${technology.description}</p><small>${this.plainEffects(technology.effects)} · ${needs}</small></div>
        <button data-research="${technology.id}" ${disabled ? 'disabled' : ''}>${done ? '已经完成' : `${technology.cost} 点`}</button>
      </article>
    `;
  }

  private renderPolicies(view: GameViewModel): string {
    return `
      <div class="mayor-panel-summary"><span>当前方向 <strong>${view.activePolicy?.name ?? '平稳发展'}</strong></span>${view.activePolicy ? '<button data-policy="">结束当前方向</button>' : ''}</div>
      <div class="mayor-choice-list">${view.policies.map((policy) => this.policyChoice(policy, view)).join('')}</div>
    `;
  }

  private policyChoice(policy: PolicyConfig, view: GameViewModel): string {
    const active = view.state.activePolicyId === policy.id;
    const disabled = active || policy.activationCost > view.state.money || view.state.completed || view.state.failed;
    return `
      <article class="mayor-choice ${active ? 'active' : ''}">
        <span>${this.asset(policy.assetId, policy.name, 'mayor-choice-image')}</span>
        <div><strong>${policy.name}</strong><p>${policy.description}</p><small>${this.plainEffects(policy.effects)}</small></div>
        <button data-policy="${policy.id}" ${disabled ? 'disabled' : ''}>${active ? '正在生效' : formatMoney(policy.activationCost)}</button>
      </article>
    `;
  }

  private renderFacilities(view: GameViewModel): string {
    if (view.buildings.length === 0) return '<div class="mayor-empty">城市还没有任何设施。</div>';
    const ordered = [...view.buildings].sort((left, right) =>
      Number(right.instanceId === this.focusedBuildingId) - Number(left.instanceId === this.focusedBuildingId)
    );
    return `<div class="mayor-facility-list">${ordered.map((building) => this.facilityCard(building, view)).join('')}</div>`;
  }

  private facilityCard(building: BuildingBase, view: GameViewModel): string {
    const quote = view.upgradeQuotes[building.instanceId];
    const ability = building.config.category === 'storage'
      ? `已存 ${formatNumber(building.storedEnergy)} / ${formatNumber(building.getStorageCapacity(view.modifiers.storageCapacityMultiplier))}`
      : `目前可供 ${formatNumber(building.getPowerOutput(view.modifiers.generationMultiplier))} MW`;
    const canUpgrade = Boolean(quote?.available && quote.cost <= view.state.money && !view.state.completed && !view.state.failed);
    return `
      <article class="mayor-facility ${building.enabled ? '' : 'offline'} ${building.instanceId === this.focusedBuildingId ? 'focused' : ''}">
        <span>${this.asset(building.config.assetId, building.config.name, 'mayor-facility-image')}</span>
        <div><strong>${building.config.name} <i>${building.level} 级</i></strong><small>${ability} · 日常开支 ${formatMoney(building.getMaintenance())}</small></div>
        <div><button data-toggle-building="${building.instanceId}">${building.enabled ? '暂时关闭' : '恢复运行'}</button><button data-upgrade="${building.instanceId}" ${canUpgrade ? '' : 'disabled'}>${quote?.available ? `扩建 ${formatMoney(quote.cost)}` : '已到最高级'}</button></div>
      </article>
    `;
  }

  private renderCityReport(view: GameViewModel): string {
    return `
      <div class="mayor-simple-grid report">
        <div><small>累计收入</small><strong>${formatMoney(view.state.totalRevenue)}</strong></div>
        <div><small>送出的电</small><strong>${formatNumber(view.state.totalEnergyServed)} MWh</strong></div>
        <div><small>缺少的电</small><strong>${formatNumber(view.state.totalShortage)} MWh</strong></div>
        <div><small>城市成绩</small><strong>${formatNumber(view.state.score)}</strong></div>
      </div>
      <section class="mayor-chart"><header><strong>城市用电变化</strong><span>绿色是能提供的电，黄色是居民需要的电</span></header>${this.powerChart(view)}</section>
    `;
  }

  private powerChart(view: GameViewModel): string {
    if (view.telemetry.length < 2) return '<div class="mayor-empty">城市运行一会儿后，这里会出现变化。</div>';
    const width = 700;
    const height = 210;
    const padding = 16;
    const max = Math.max(1, ...view.telemetry.flatMap((point) => [point.supply, point.demand]));
    const points = (key: 'supply' | 'demand'): string => view.telemetry.map((point, index) => {
      const x = padding + index / Math.max(1, view.telemetry.length - 1) * (width - padding * 2);
      const y = height - padding - point[key] / max * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 ${width} ${height}"><polyline class="need" points="${points('demand')}"/><polyline class="have" points="${points('supply')}"/></svg>`;
  }

  private renderOffice(): string {
    return `<div class="mayor-office-actions">
      <button data-session="save"><strong>保存游戏</strong><span>下次从这里继续建设</span></button>
      <button data-session="load"><strong>读取存档</strong><span>回到上次保存的位置</span></button>
      <button data-session="menu"><strong>返回城市列表</strong><span>选择另一座城市</span></button>
    </div>`;
  }

  private renderResult(view: GameViewModel): string {
    const complete = view.state.completed;
    return `
      <div class="mayor-result-shade"><section class="mayor-result ${complete ? 'success' : 'failure'}">
        <span>${complete ? '★' : this.asset('status_warning', '挑战失败', 'mayor-result-image')}</span>
        <small>${complete ? '城市目标已经完成' : '城市无法继续运转'}</small>
        <h2>${complete ? '这座城市建设成功' : '重新规划这座城市'}</h2>
        <p>${complete ? `你完成了“${view.level.rules.objective.label}”。` : view.level.rules.failure.label}</p>
        <div><b>第 ${view.state.day} 天</b><b>城市成绩 ${formatNumber(view.state.score)}</b><b>剩余资金 ${formatMoney(view.state.money)}</b></div>
        <footer><button data-result="menu">城市列表</button><button data-result="retry">重新开始</button>${complete && view.level.progression.nextLevelId ? '<button class="primary" data-result="next">下一座城市</button>' : ''}</footer>
      </section></div>
    `;
  }

  private plainEffects(effects: Record<string, number | undefined>): string {
    const names: Record<string, string> = {
      generationMultiplier: '供电能力',
      demandMultiplier: '全城用电',
      priceMultiplier: '城市收入',
      maintenanceMultiplier: '日常开支',
      satisfactionDeltaPerHour: '居民满意',
      pollutionMultiplier: '环境压力',
      storageCapacityMultiplier: '备用电量',
      storageRateMultiplier: '存取电速度',
      storageEfficiencyBonus: '存电损耗',
      researchMultiplier: '发展点增长'
    };
    const additive = new Set(['satisfactionDeltaPerHour', 'storageEfficiencyBonus']);
    return Object.entries(effects)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => {
        const amount = value ?? 0;
        if (additive.has(key)) return `${names[key] ?? key} ${amount >= 0 ? '改善' : '下降'} ${Math.abs(amount * 100).toFixed(0)}%`;
        const change = Math.round((amount - 1) * 100);
        return `${names[key] ?? key} ${change >= 0 ? '提高' : '降低'} ${Math.abs(change)}%`;
      }).join(' · ') || '为城市带来新的选择';
  }

  private asset(id: string, alt: string, className = 'mayor-asset'): string {
    const src = AssetManager.get(id, '');
    if (!src || !src.startsWith('/')) return `<span class="mayor-asset-fallback" aria-label="${escapeAttribute(alt)}">◇</span>`;
    return `<img class="mayor-asset ${className}" src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" draggable="false" data-mayor-fallback="◇"/>`;
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

  private openPanel(panel: MayorPanel): void {
    this.activePanel = panel;
    this.selectedBuildingId = undefined;
    if (this.lastView) this.render(this.lastView);
  }

  private selectBuilding(buildingId?: string): void {
    this.activePanel = 'none';
    this.selectedBuildingId = this.selectedBuildingId === buildingId ? undefined : buildingId;
    if (this.lastView) this.render(this.lastView);
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((button) => button.addEventListener('click', () => {
      const panel = button.dataset.panel as MayorPanel;
      this.focusedBuildingId = button.dataset.focusBuilding;
      this.openPanel(this.activePanel === panel ? 'none' : panel);
    }));
    this.root.querySelectorAll<HTMLElement>('[data-panel-close]').forEach((element) => element.addEventListener('click', () => this.openPanel('none')));
    this.root.querySelectorAll<HTMLButtonElement>('[data-guide-panel]').forEach((button) => button.addEventListener('click', () => this.openPanel(button.dataset.guidePanel as MayorGuidePanel)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-guide-build]').forEach((button) => button.addEventListener('click', () => this.selectBuilding(button.dataset.guideBuild)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-select-build]').forEach((button) => button.addEventListener('click', () => this.selectBuilding(button.dataset.selectBuild)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-cancel-build]').forEach((button) => button.addEventListener('click', () => this.selectBuilding(undefined)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-place-plot]').forEach((button) => button.addEventListener('click', () => {
      if (!this.selectedBuildingId) return;
      const result = this.actions.onBuild(this.selectedBuildingId, button.dataset.placePlot);
      if (result.ok) this.selectedBuildingId = undefined;
      this.showNotice(result.ok ? '设施已经出现在城市里' : result.reason ?? '这里不能建设');
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => button.addEventListener('click', () => this.actions.onSpeedChange(Number(button.dataset.speed) as GameSpeed)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-research]').forEach((button) => button.addEventListener('click', () => {
      const result = this.actions.onResearch(button.dataset.research ?? '');
      this.showNotice(result.ok ? '城市发展项目已经生效' : result.reason ?? '现在还不能选择');
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-policy]').forEach((button) => button.addEventListener('click', () => {
      const result = this.actions.onPolicy(button.dataset.policy || undefined);
      this.showNotice(result.ok ? '城市发展方向已经改变' : result.reason ?? '现在还不能选择');
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => button.addEventListener('click', () => {
      const result = this.actions.onUpgrade(button.dataset.upgrade ?? '');
      this.showNotice(result.ok ? '设施扩建完成' : result.reason ?? '暂时无法扩建');
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-toggle-building]').forEach((button) => button.addEventListener('click', () => {
      const result = this.actions.onToggleBuilding(button.dataset.toggleBuilding ?? '');
      this.showNotice(result.ok ? '设施状态已经改变' : result.reason ?? '操作没有成功');
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-session]').forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.session;
      if (action === 'save') this.showNotice(this.actions.onSave().message);
      if (action === 'load') {
        const result = this.actions.onLoad();
        if (!result.ok) this.showNotice(result.message);
      }
      if (action === 'menu') this.actions.onMenu();
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-result]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.result === 'menu') this.actions.onMenu();
      if (button.dataset.result === 'retry') this.actions.onRetry();
      if (button.dataset.result === 'next') this.actions.onNext();
    }));
    this.root.querySelectorAll<HTMLImageElement>('img[data-mayor-fallback]').forEach((image) => image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'mayor-asset-fallback';
      fallback.textContent = image.dataset.mayorFallback ?? '◇';
      image.replaceWith(fallback);
    }, { once: true }));
    const price = this.root.querySelector<HTMLInputElement>('#mayor-price');
    price?.addEventListener('change', () => this.actions.onPriceChange(Number(price.value)));
  }
}
