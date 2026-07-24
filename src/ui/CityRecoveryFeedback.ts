import type { GameViewModel } from '../core/GameManager';
import { CitySceneMapper } from '../presentation/CitySceneMapper';
import { CityRecoveryFeedbackSystem, type CityRecoveryFeedbackEvent, type CityRecoverySnapshot } from '../systems/CityRecoveryFeedbackSystem';
import { DawnCityExperienceSystem } from '../systems/DawnCityExperienceSystem';

const feedbackDurationMs = 2850;

export class CityRecoveryFeedback {
  private previous?: CityRecoverySnapshot;
  private readonly queue: CityRecoveryFeedbackEvent[] = [];
  private activeEventId?: string;
  private timer?: number;
  private shell?: HTMLElement;

  constructor(private readonly root: HTMLElement) {}

  render(view: GameViewModel): void {
    if (view.level.id !== 'city-01') {
      this.reset();
      return;
    }

    const next = this.snapshot(view);
    const events = CityRecoveryFeedbackSystem.detect(this.previous, next);
    this.previous = next;
    this.enqueue(events);
  }

  destroy(): void {
    this.reset();
  }

  private snapshot(view: GameViewModel): CityRecoverySnapshot {
    const scene = CitySceneMapper.map(view);
    const beat = DawnCityExperienceSystem.evaluate({
      state: view.state,
      buildings: view.buildings,
      availableBuildings: view.availableBuildings,
      technologies: view.technologies,
      goalProgress: view.goalProgress
    });
    return {
      levelId: view.level.id,
      completed: view.state.completed,
      beatId: beat?.id,
      districts: (scene.districtPrefabs ?? []).map((district) => ({
        id: district.id,
        label: district.label,
        status: district.status
      }))
    };
  }

  private enqueue(events: readonly CityRecoveryFeedbackEvent[]): void {
    for (const event of events) {
      if (event.id === this.activeEventId || this.queue.some((queued) => queued.id === event.id)) continue;
      this.queue.push(event);
    }
    this.queue.sort((left, right) => right.priority - left.priority);
    if (!this.shell) this.showNext();
  }

  private showNext(): void {
    const event = this.queue.shift();
    if (!event) {
      this.activeEventId = undefined;
      return;
    }

    this.activeEventId = event.id;
    const shell = document.createElement('section');
    shell.className = `city-recovery-feedback tone-${event.tone}`;
    shell.dataset.cityRecoveryFeedback = event.id;
    shell.setAttribute('role', 'status');
    shell.setAttribute('aria-live', event.tone === 'danger' ? 'assertive' : 'polite');

    const vignette = document.createElement('div');
    vignette.className = 'city-recovery-vignette';
    const ripple = document.createElement('div');
    ripple.className = 'city-recovery-ripple';
    ripple.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));

    const card = document.createElement('div');
    card.className = 'city-recovery-card';
    const eyebrow = document.createElement('small');
    eyebrow.textContent = event.tone === 'danger' ? '城市电网警报' : event.tone === 'celebration' ? '城市里程碑' : '城市状态变化';
    const title = document.createElement('strong');
    title.textContent = event.title;
    const message = document.createElement('p');
    message.textContent = event.message;
    card.append(eyebrow, title, message);
    shell.append(vignette, ripple, card);
    this.root.append(shell);
    this.shell = shell;

    requestAnimationFrame(() => shell.classList.add('is-visible'));
    this.timer = window.setTimeout(() => {
      shell.classList.remove('is-visible');
      window.setTimeout(() => {
        shell.remove();
        if (this.shell === shell) this.shell = undefined;
        this.timer = undefined;
        this.showNext();
      }, 220);
    }, feedbackDurationMs);
  }

  private reset(): void {
    this.previous = undefined;
    this.queue.length = 0;
    this.activeEventId = undefined;
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
    this.shell?.remove();
    this.shell = undefined;
  }
}
