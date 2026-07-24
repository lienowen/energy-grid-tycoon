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
  private dismissed = false;
  private lastBeatId?: DawnCityExperienceBeat['id'];

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

    this.syncMissionCard(beat);

    if (this.lastBeatId && this.lastBeatId !== beat.id) {
      this.announce(`阶段完成。现在进入第 ${beat.stage} 阶段：${beat.title}`);
    }
    this.lastBeatId = beat.id;

    if (this.dismissed) {
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

    const progress = Math.round(beat.progress * 100);
    card.className = `release-onboarding experience-${beat.tone}`;
    card.dataset.experienceBeat = beat.id;
    card.innerHTML = `
      <div class="release-onboarding-copy">
        <small>曙光新城 · 第 ${beat.stage} / ${beat.totalStages} 阶段</small>
        <strong>${escapeHtml(beat.title)}</strong>
        <p>${escapeHtml(beat.message)}</p>
        <div class="release-experience-progress" aria-label="阶段进度 ${progress}%"><i style="width:${progress}%"></i></div>
        <em>${progress}% · 完成后：${escapeHtml(beat.nextPromise)}</em>
      </div>
      <div class="release-onboarding-actions">
        <button type="button" data-onboarding-focus="true">${escapeHtml(beat.actionLabel)}</button>
        <button type="button" data-onboarding-skip="true">暂时收起</button>
      </div>
    `;

    card.querySelector<HTMLButtonElement>('[data-onboarding-focus]')?.addEventListener('click', () => {
      this.activateTarget();
    });
    card.querySelector<HTMLButtonElement>('[data-onboarding-skip]')?.addEventListener('click', () => {
      this.dismissed = true;
      this.clearHighlight();
      card?.remove();
    });
  }

  record(_action: OnboardingAction): void {
    if (this.lastView && !this.dismissed) this.render(this.lastView);
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
    mission.innerHTML = `
      <span>${beat.stage}</span>
      <div>
        <small>当前任务 · ${beat.stage}/${beat.totalStages}</small>
        <strong>${escapeHtml(beat.title)}</strong>
        <p>${escapeHtml(beat.nextPromise)}</p>
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
