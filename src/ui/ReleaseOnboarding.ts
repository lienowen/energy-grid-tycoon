import type { GameViewModel } from '../core/GameManager';

type OnboardingStep = 'choose' | 'place' | 'manage' | 'speed' | 'done';
type OnboardingAction = 'buildPlaced' | 'facilityManaged' | 'speedChanged';

interface StoredOnboardingState {
  version: 1;
  step: OnboardingStep;
  completed: boolean;
}

interface StepContent {
  eyebrow: string;
  title: string;
  message: string;
  target: string;
}

const STORAGE_KEY = 'energy-grid-tycoon:onboarding:v1';

const steps: Record<Exclude<OnboardingStep, 'done'>, StepContent> = {
  choose: {
    eyebrow: '第 1 步 / 4',
    title: '选择一个建设项目',
    message: '从底部项目栏选择发电或储能设施。资金不足的项目会自动锁定。',
    target: '.hologram-build-dock'
  },
  place: {
    eyebrow: '第 2 步 / 4',
    title: '把设施放进城市',
    message: '拖动沙盘寻找位置，发亮地块可以建设。轻点地块确认施工。',
    target: '.hologram-canvas-host'
  },
  manage: {
    eyebrow: '第 3 步 / 4',
    title: '管理已建成的设施',
    message: '打开“设施”面板，扩建、停运或恢复城市中的能源设施。',
    target: '[data-panel="fleet"]'
  },
  speed: {
    eyebrow: '第 4 步 / 4',
    title: '让城市开始运转',
    message: '使用右上角速度按钮推进时间，观察供电、资金和居民满意度的变化。',
    target: '.hologram-speed'
  }
};

const defaultState = (): StoredOnboardingState => ({
  version: 1,
  step: 'choose',
  completed: false
});

const loadState = (): StoredOnboardingState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<StoredOnboardingState>;
    const validSteps: OnboardingStep[] = ['choose', 'place', 'manage', 'speed', 'done'];
    if (!parsed.step || !validSteps.includes(parsed.step)) return defaultState();
    return {
      version: 1,
      step: parsed.step,
      completed: parsed.completed === true || parsed.step === 'done'
    };
  } catch {
    return defaultState();
  }
};

export class ReleaseOnboarding {
  private state = loadState();
  private lastView?: GameViewModel;
  private highlighted?: Element;
  private announcementTimer?: number;

  constructor(private readonly root: HTMLElement) {
    this.root.addEventListener('click', this.handleRootClick);
  }

  render(view: GameViewModel): void {
    this.lastView = view;
    this.syncWithGame(view);
    this.clearHighlight();

    if (this.state.completed) {
      this.root.querySelector('[data-release-onboarding]')?.remove();
      return;
    }

    const content = steps[this.state.step as Exclude<OnboardingStep, 'done'>];
    if (!content) return;

    const target = this.root.querySelector(content.target);
    target?.classList.add('release-onboarding-target');
    this.highlighted = target ?? undefined;

    let card = this.root.querySelector<HTMLElement>('[data-release-onboarding]');
    if (!card) {
      card = document.createElement('aside');
      card.dataset.releaseOnboarding = 'true';
      card.className = 'release-onboarding';
      card.setAttribute('role', 'status');
      card.setAttribute('aria-live', 'polite');
      this.root.append(card);
    }

    card.innerHTML = `
      <div class="release-onboarding-copy">
        <small>${content.eyebrow}</small>
        <strong>${content.title}</strong>
        <p>${content.message}</p>
      </div>
      <div class="release-onboarding-actions">
        <button type="button" data-onboarding-focus="true">带我过去</button>
        <button type="button" data-onboarding-skip="true">跳过引导</button>
      </div>
    `;

    card.querySelector<HTMLButtonElement>('[data-onboarding-focus]')?.addEventListener('click', () => {
      this.highlighted?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      if (this.highlighted instanceof HTMLElement) this.highlighted.focus({ preventScroll: true });
    });
    card.querySelector<HTMLButtonElement>('[data-onboarding-skip]')?.addEventListener('click', () => this.complete());
  }

  record(action: OnboardingAction): void {
    if (this.state.completed) return;
    if (action === 'buildPlaced' && (this.state.step === 'choose' || this.state.step === 'place')) {
      this.setStep('manage');
    } else if (action === 'facilityManaged' && this.state.step === 'manage') {
      this.setStep('speed');
    } else if (action === 'speedChanged' && this.state.step === 'speed') {
      this.complete();
      this.announce('新手引导完成。现在这座城市交给你了。');
    }
  }

  announce(message: string): void {
    this.root.querySelector('[data-release-announcement]')?.remove();
    const notice = document.createElement('div');
    notice.dataset.releaseAnnouncement = 'true';
    notice.className = 'release-announcement';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    this.root.append(notice);
    if (this.announcementTimer !== undefined) window.clearTimeout(this.announcementTimer);
    this.announcementTimer = window.setTimeout(() => notice.remove(), 4200);
  }

  destroy(): void {
    this.root.removeEventListener('click', this.handleRootClick);
    this.clearHighlight();
    this.root.querySelector('[data-release-onboarding]')?.remove();
    this.root.querySelector('[data-release-announcement]')?.remove();
    if (this.announcementTimer !== undefined) window.clearTimeout(this.announcementTimer);
  }

  private readonly handleRootClick = (event: Event): void => {
    if (this.state.completed) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-select-build]') && this.state.step === 'choose') this.setStep('place');
    if (target.closest('[data-panel="fleet"]') && this.state.step === 'manage') {
      this.announce('选择任意设施即可扩建、停运或恢复运行。');
    }
  };

  private syncWithGame(view: GameViewModel): void {
    if (view.state.completed || view.state.failed) {
      this.complete();
      return;
    }
    const initialCount = view.level.initial.buildings.length;
    if (
      view.buildings.length > initialCount
      && (this.state.step === 'choose' || this.state.step === 'place')
    ) {
      this.setStep('manage', false);
    }
  }

  private setStep(step: OnboardingStep, rerender = true): void {
    this.state = { version: 1, step, completed: step === 'done' };
    this.persist();
    if (rerender && this.lastView) this.render(this.lastView);
  }

  private complete(): void {
    this.setStep('done', false);
    this.clearHighlight();
    this.root.querySelector('[data-release-onboarding]')?.remove();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // The tutorial still works for the current session when storage is unavailable.
    }
  }

  private clearHighlight(): void {
    this.highlighted?.classList.remove('release-onboarding-target');
    this.highlighted = undefined;
  }
}
