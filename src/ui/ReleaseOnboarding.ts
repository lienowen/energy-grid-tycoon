import type { GameViewModel } from '../core/GameManager';
import {
  DawnCityExperienceSystem,
  type DawnCityExperienceBeat
} from '../systems/DawnCityExperienceSystem';

type OnboardingAction = 'buildPlaced' | 'facilityManaged' | 'speedChanged';

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export class ReleaseOnboarding {
  private lastView?: GameViewModel;
  private highlighted?: Element;
  private announcementTimer?: number;
  private lastBeatId?: DawnCityExperienceBeat['id'];
  private dismissedBeatId?: DawnCityExperienceBeat['id'];

  constructor(private readonly root: HTMLElement) {}

  render(view: GameViewModel): void {
    this.lastView = view;
    this.clearHighlight();

    if (view.level.id !== 'city-01' || view.state.completed || view.state.failed) {
      this.root.querySelector('[data-release-onboarding]')?.remove();
      return;
    }

    const beat = DawnCityExperienceSystem.evaluate({
      state: view.state,
      buildings: view.buildings,
      availableBuildings: view.availableBuildings,
      technologies: view.technologies,
      goalProgress: view.goalProgress
    });
    if (!beat) {
      this.root.querySelector('[data-release-onboarding]')?.remove();
      return;
    }

    const beatChanged = this.lastBeatId !== beat.id;
    if (beatChanged) {
      this.lastBeatId = beat.id;
      this.dismissedBeatId = undefined;
    }

    this.syncMissionCard(beat);

    const actionable = beat.action.type !== 'wait';
    if (!actionable || this.dismissedBeatId === beat.id) {
      this.root.querySelector('[data-release-onboarding]')?.remove();
      return;
    }

    const target = this.root.querySelector(this.targetSelector(view, beat));
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

    card.className = `release-onboarding experience-${beat.tone}`;
    card.dataset.experienceBeat = beat.id;
    card.innerHTML = `
      <div class="release-onboarding-copy">
        <small>第 ${beat.stage} / ${beat.totalStages} 阶段 · 可立即行动</small>
        <strong>${escapeHtml(beat.actionLabel)}</strong>
      </div>
      <div class="release-onboarding-actions">
        <button type="button" data-onboarding-focus="true">执行</button>
        <button type="button" data-onboarding-skip="true" aria-label="收起本阶段提示">×</button>
      </div>
    `;

    card.querySelector<HTMLButtonElement>('[data-onboarding-focus]')?.addEventListener('click', () => {
      this.activateTarget();
    });
    card.querySelector<HTMLButtonElement>('[data-onboarding-skip]')?.addEventListener('click', () => {
      this.dismissedBeatId = beat.id;
      this.clearHighlight();
      card?.remove();
    });
  }

  record(_action: OnboardingAction): void {
    if (this.lastView) this.render(this.lastView);
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
    this.announcementTimer = window.setTimeout(() => notice.remove(), 3000);
  }

  destroy(): void {
    this.clearHighlight();
    this.root.querySelector('[data-release-onboarding]')?.remove();
    this.root.querySelector('[data-release-announcement]')?.remove();
    if (this.announcementTimer !== undefined) window.clearTimeout(this.announcementTimer);
  }

  private syncMissionCard(beat: DawnCityExperienceBeat): void {
    const mission = this.root.querySelector<HTMLElement>('.hologram-mission-card');
    if (!mission) return;
    const progress = Math.round(beat.progress * 100);
    mission.dataset.dawnBeat = beat.id;
    mission.dataset.tone = beat.tone;
    mission.setAttribute('aria-label', `${beat.title}，进度 ${progress}%，完成后 ${beat.nextPromise}`);
    mission.innerHTML = `
      <span>${beat.stage}</span>
      <div>
        <small>当前任务 · ${beat.stage}/${beat.totalStages}</small>
        <strong>${escapeHtml(beat.title)}</strong>
      </div>
      <em>${progress}%</em>
      <div class="hologram-progress"><i style="width:${progress}%"></i></div>
    `;
  }

  private targetSelector(view: GameViewModel, beat: DawnCityExperienceBeat): string {
    if (beat.id === 'stabilize') {
      const gas = view.buildings.find((building) => building.config.id === 'gas_basic');
      if (!gas) return '[data-select-build="gas_basic"]';
      if (!gas.enabled) return '[data-panel="fleet"]';
      return '.hologram-speed';
    }
    if (beat.id === 'store') return '[data-select-build="battery_basic"]';
    if (beat.id === 'develop') {
      const target = view.technologies.find((technology) =>
        !view.state.unlockedTechnologyIds.includes(technology.id)
        && technology.prerequisites.every((id) => view.state.unlockedTechnologyIds.includes(id))
      );
      return target && view.state.researchPoints >= target.cost
        ? '[data-panel="research"]'
        : '.hologram-speed';
    }
    return '[data-panel="market"]';
  }

  private activateTarget(): void {
    const target = this.highlighted;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    if (target instanceof HTMLButtonElement && !target.disabled) {
      target.click();
      return;
    }
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }

  private clearHighlight(): void {
    this.highlighted?.classList.remove('release-onboarding-target');
    this.highlighted = undefined;
  }
}
