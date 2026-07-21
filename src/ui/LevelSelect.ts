import { AssetManager } from '../resources/AssetManager';
import { LevelConfig } from '../systems/LevelLoader';

export interface LevelSelectItem {
  level: LevelConfig;
  unlocked: boolean;
  completed: boolean;
  hasSave: boolean;
  bestScore: number;
}

export interface LevelSelectActions {
  onStart: (levelId: string) => void;
  onContinue: (levelId: string) => void;
}

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);

const escapeAttribute = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export class LevelSelect {
  constructor(
    private readonly root: HTMLElement,
    private readonly actions: LevelSelectActions
  ) {}

  render(items: LevelSelectItem[]): void {
    const completedCount = items.filter((item) => item.completed).length;
    const totalBestScore = items.reduce((sum, item) => sum + item.bestScore, 0);

    this.root.innerHTML = `
      <main class="campaign-shell">
        <header class="campaign-hero">
          <div>
            <span class="eyebrow">ENERGY GRID TYCOON</span>
            <h1>城市能源战役</h1>
            <p>建设电源、调配储能、升级设施、研发科技并制定政策，守住每一座城市。</p>
          </div>
          <div class="campaign-summary">
            <span>完成城市 <strong>${completedCount}/${items.length}</strong></span>
            <span>累计最佳评分 <strong>${formatNumber(totalBestScore)}</strong></span>
          </div>
        </header>

        <section class="campaign-grid">
          ${items.map((item, index) => this.card(item, index)).join('')}
        </section>

        <footer class="campaign-footer">
          <span>关卡目标、失败线、解锁关系与数值规则全部来自配置</span>
          <span>素材：全局资源清单 · 场景按配置选择</span>
        </footer>
      </main>
    `;

    this.root.querySelectorAll<HTMLButtonElement>('[data-start]').forEach((button) => {
      button.addEventListener('click', () => this.actions.onStart(button.dataset.start ?? ''));
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-continue]').forEach((button) => {
      button.addEventListener('click', () => this.actions.onContinue(button.dataset.continue ?? ''));
    });
  }

  private card(item: LevelSelectItem, index: number): string {
    const { level, unlocked, completed, hasSave, bestScore } = item;
    const backgroundId = level.presentation?.backgroundAssetId;
    const background = backgroundId ? AssetManager.get(backgroundId, '') : '';
    const accent = level.presentation?.accent ?? '#4ad7ff';
    const style = `--scenario-accent:${escapeAttribute(accent)};${background ? `--scenario-background:url('${escapeAttribute(background)}');` : ''}`;

    return `
      <article class="campaign-card scenario-card ${unlocked ? '' : 'locked'} ${completed ? 'completed' : ''}" style="${style}">
        <div class="campaign-index">${String(index + 1).padStart(2, '0')}</div>
        <div class="campaign-copy">
          <span>${completed ? '已完成' : unlocked ? '可进入' : '未解锁'}</span>
          <h2>${level.name}</h2>
          <p>${level.description}</p>
        </div>
        <dl class="campaign-stats">
          <div><dt>人口</dt><dd>${formatNumber(level.initial.population)}</dd></div>
          <div><dt>需求</dt><dd>${formatNumber(level.initial.baseDemand)} MW</dd></div>
          <div><dt>目标</dt><dd>${level.rules.objective.label}</dd></div>
          <div><dt>最佳评分</dt><dd>${bestScore > 0 ? formatNumber(bestScore) : '—'}</dd></div>
        </dl>
        <div class="campaign-actions">
          ${hasSave && unlocked ? `<button class="secondary-action" data-continue="${level.id}">继续存档</button>` : ''}
          <button class="primary-action" data-start="${level.id}" ${unlocked ? '' : 'disabled'}>
            ${completed ? '重新挑战' : unlocked ? '开始运营' : '解锁条件未满足'}
          </button>
        </div>
      </article>
    `;
  }
}
