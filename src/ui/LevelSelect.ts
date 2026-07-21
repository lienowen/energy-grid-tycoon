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
      <main class="campaign-shell mayor-campaign">
        <header class="campaign-hero">
          <div>
            <span class="eyebrow">MAYOR APPOINTMENT</span>
            <h1>选择你要接手的城市</h1>
            <p>听取居民的需要，安排城市建设，在资金、生活和环境之间做出市长决定。</p>
          </div>
          <div class="campaign-summary">
            <span>兑现承诺 <strong>${completedCount}/${items.length}</strong></span>
            <span>市民累计评价 <strong>${formatNumber(totalBestScore)}</strong></span>
          </div>
        </header>

        <section class="campaign-grid">
          ${items.map((item, index) => this.card(item, index)).join('')}
        </section>

        <footer class="campaign-footer">
          <span>每座城市都有不同的居民、产业和环境问题</span>
          <span>市政秘书会在治理过程中告诉你下一步可以做什么</span>
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
          <span>${completed ? '承诺已兑现' : unlocked ? '等待市长接手' : '尚未开放'}</span>
          <h2>${level.name}</h2>
          <p>${level.description}</p>
        </div>
        <dl class="campaign-stats">
          <div><dt>居民</dt><dd>${formatNumber(level.initial.population)} 人</dd></div>
          <div><dt>用电压力</dt><dd>${formatNumber(level.initial.baseDemand)} MW</dd></div>
          <div><dt>市长承诺</dt><dd>${level.rules.objective.label}</dd></div>
          <div><dt>最好评价</dt><dd>${bestScore > 0 ? formatNumber(bestScore) : '—'}</dd></div>
        </dl>
        <div class="campaign-actions">
          ${hasSave && unlocked ? `<button class="secondary-action" data-continue="${level.id}">继续治理</button>` : ''}
          <button class="primary-action" data-start="${level.id}" ${unlocked ? '' : 'disabled'}>
            ${completed ? '再次治理' : unlocked ? '接手这座城市' : '先完成前一座城市'}
          </button>
        </div>
      </article>
    `;
  }
}
