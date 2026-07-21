import { BuildingConfig } from '../buildings/BuildingBase';
import { GameSpeed } from '../core/GameState';
import { GameViewModel } from '../core/GameManager';
import { AssetManager } from '../resources/AssetManager';

export interface DashboardActions {
  onBuild: (configId: string) => { ok: boolean; reason?: string };
  onSpeedChange: (speed: GameSpeed) => void;
  onPriceChange: (price: number) => void;
}

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);

export class Dashboard {
  private notice = '';

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: DashboardActions
  ) {}

  render(view: GameViewModel): void {
    const { state, level, availableBuildings, buildings, activeEvent, lastEconomy, goalProgress } = view;
    const buildingCounts = new Map<string, number>();
    for (const building of buildings) {
      buildingCounts.set(building.config.id, (buildingCounts.get(building.config.id) ?? 0) + 1);
    }

    const goalLabel = level.goal.type === 'money'
      ? `资金达到 ${formatMoney(level.goal.target)}`
      : level.goal.type === 'satisfaction'
        ? `满意度达到 ${level.goal.target}% 并坚持到第 3 天`
        : `人口达到 ${formatNumber(level.goal.target)}`;

    this.root.innerHTML = `
      <main class="game-shell">
        <header class="topbar">
          <div class="brand">
            <span class="brand-mark">${AssetManager.get('brand_logo')}</span>
            <div>
              <h1>ENERGY GRID TYCOON</h1>
              <p>${level.name} · 第 ${state.day} 天 ${String(Math.floor(state.hour)).padStart(2, '0')}:00</p>
            </div>
          </div>
          <div class="speed-controls" aria-label="游戏速度">
            ${([0, 1, 2, 4] as GameSpeed[]).map((speed) => `
              <button class="speed-button ${state.speed === speed ? 'active' : ''}" data-speed="${speed}">
                ${speed === 0 ? '暂停' : `${speed}×`}
              </button>
            `).join('')}
          </div>
        </header>

        <section class="status-grid">
          ${this.metric('资金', formatMoney(state.money), lastEconomy ? `${lastEconomy.profit >= 0 ? '+' : ''}${formatMoney(lastEconomy.profit)}/tick` : '等待结算', 'money')}
          ${this.metric('供电', `${Math.round(state.supplyRatio * 100)}%`, `${formatNumber(state.powerSupply)} / ${formatNumber(state.powerDemand)} MW`, state.supplyRatio >= 0.98 ? 'good' : 'danger')}
          ${this.metric('人口', formatNumber(state.population), `满意度 ${state.satisfaction.toFixed(1)}%`, state.satisfaction >= 70 ? 'good' : 'danger')}
          ${this.metric('污染', `${state.pollution.toFixed(0)}%`, `评分 ${formatNumber(state.score)}`, state.pollution <= 25 ? 'good' : 'warning')}
        </section>

        <section class="main-grid">
          <div class="city-panel panel">
            <div class="panel-heading">
              <div>
                <span class="eyebrow">CITY CONTROL</span>
                <h2>城市能源调度图</h2>
              </div>
              <div class="grid-status ${state.supplyRatio >= 0.98 ? 'stable' : 'unstable'}">
                ${AssetManager.get(state.supplyRatio >= 0.98 ? 'status_stable' : 'status_warning')}
                ${state.supplyRatio >= 0.98 ? '电网稳定' : '存在缺电'}
              </div>
            </div>

            <div class="city-map">
              <div class="city-core">
                <span>🏙️</span>
                <strong>${level.name}</strong>
                <small>${formatNumber(state.population)} 人</small>
              </div>
              <div class="power-ring" style="--supply:${Math.min(state.supplyRatio, 1) * 360}deg">
                <div><strong>${Math.round(Math.min(state.supplyRatio, 1) * 100)}%</strong><span>供电率</span></div>
              </div>
              <div class="building-fleet">
                ${availableBuildings.map((config) => this.buildingNode(config, buildingCounts.get(config.id) ?? 0)).join('')}
              </div>
            </div>

            ${activeEvent ? `
              <div class="event-banner">
                <span class="event-icon">${AssetManager.get(`event_${activeEvent.config.id}`)}</span>
                <div>
                  <strong>${activeEvent.config.name}</strong>
                  <p>${activeEvent.config.description} · 剩余 ${Math.ceil(activeEvent.remainingHours)} 小时</p>
                </div>
              </div>
            ` : '<div class="event-banner quiet"><span>📡</span><div><strong>城市运行平稳</strong><p>调度中心正在监测负荷和天气。</p></div></div>'}
          </div>

          <aside class="control-panel panel">
            <span class="eyebrow">POLICY & BUILD</span>
            <h2>调度决策</h2>

            <label class="price-control">
              <span><strong>居民电价</strong><em>${state.powerPrice.toFixed(2)} 元/kWh</em></span>
              <input id="price-slider" type="range" min="0.15" max="1.2" step="0.01" value="${state.powerPrice}" />
              <small>高电价提高收入，但长期会影响满意度。</small>
            </label>

            <div class="build-list">
              ${availableBuildings.map((config) => this.buildCard(config, buildingCounts.get(config.id) ?? 0, state.money)).join('')}
            </div>

            <div class="goal-card ${state.completed ? 'completed' : state.failed ? 'failed' : ''}">
              <div class="goal-copy">
                <span>当前目标</span>
                <strong>${goalLabel}</strong>
              </div>
              <div class="progress-track"><i style="width:${Math.round(goalProgress * 100)}%"></i></div>
              <small>${state.completed ? '任务完成，城市进入稳定发展阶段。' : state.failed ? '城市运营失败，请重新规划。' : `完成度 ${Math.round(goalProgress * 100)}%`}</small>
            </div>

            ${this.notice ? `<div class="toast">${this.notice}</div>` : ''}
          </aside>
        </section>
      </main>
    `;

    this.bindEvents();
  }

  private metric(title: string, value: string, detail: string, tone: string): string {
    return `<article class="metric-card ${tone}"><span>${title}</span><strong>${value}</strong><small>${detail}</small></article>`;
  }

  private buildingNode(config: BuildingConfig, count: number): string {
    return `<div class="building-node"><span>${AssetManager.get(config.assetId)}</span><strong>${config.name}</strong><small>× ${count}</small></div>`;
  }

  private buildCard(config: BuildingConfig, count: number, money: number): string {
    const disabled = money < config.cost;
    return `
      <button class="build-card" data-build="${config.id}" ${disabled ? 'disabled' : ''}>
        <span class="build-icon">${AssetManager.get(config.assetId)}</span>
        <span class="build-copy"><strong>${config.name}</strong><small>${config.description}</small><em>${formatNumber(config.power)} MW · 维护 ${formatMoney(config.maintenance)}</em></span>
        <span class="build-price">${formatMoney(config.cost)}<small>已有 ${count}</small></span>
      </button>
    `;
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      button.addEventListener('click', () => this.actions.onSpeedChange(Number(button.dataset.speed) as GameSpeed));
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-build]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = this.actions.onBuild(button.dataset.build ?? '');
        this.notice = result.ok ? '建设指令已下达' : result.reason ?? '建设失败';
        window.setTimeout(() => { this.notice = ''; }, 1800);
      });
    });

    const price = this.root.querySelector<HTMLInputElement>('#price-slider');
    price?.addEventListener('input', () => this.actions.onPriceChange(Number(price.value)));
  }
}