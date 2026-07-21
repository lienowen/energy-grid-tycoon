import { BuildingConfig } from '../buildings/BuildingBase';
import { EventConfig } from '../systems/EventSystem';
import { LevelConfig } from '../systems/LevelLoader';
import { LevelProgressionSystem } from '../systems/LevelProgressionSystem';
import { PolicyConfig } from '../systems/PolicySystem';
import { TechnologyConfig } from '../systems/ResearchSystem';
import { Dashboard } from '../ui/Dashboard';
import { LevelSelect } from '../ui/LevelSelect';
import { GameManager, GameViewModel } from './GameManager';
import { SaveManager } from './SaveManager';

export class AppController {
  private game?: GameManager;
  private dashboard?: Dashboard;
  private currentLevelId?: string;
  private lastAutoSaveDay = 0;
  private completionRecorded = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly levels: LevelConfig[],
    private readonly buildings: BuildingConfig[],
    private readonly events: EventConfig[],
    private readonly technologies: TechnologyConfig[],
    private readonly policies: PolicyConfig[]
  ) {}

  start(): void {
    this.showCampaign();
    window.addEventListener('beforeunload', () => this.game?.destroy());
  }

  private showCampaign(): void {
    this.game?.destroy();
    this.game = undefined;
    this.dashboard = undefined;
    this.currentLevelId = undefined;

    const profile = SaveManager.loadProfile();
    const save = SaveManager.loadGame();
    const completed = new Set(profile.completedLevelIds);
    const items = this.levels.map((level) => ({
      level,
      unlocked: LevelProgressionSystem.isUnlocked(level, completed),
      completed: completed.has(level.id),
      hasSave: save?.levelId === level.id,
      bestScore: profile.bestScoreByLevel[level.id] ?? 0
    }));

    new LevelSelect(this.root, {
      onStart: (levelId) => this.startLevel(levelId, false),
      onContinue: (levelId) => this.startLevel(levelId, true)
    }).render(items);
  }

  private startLevel(levelId: string, resume: boolean): void {
    const level = this.levels.find((item) => item.id === levelId);
    if (!level) return;

    this.game?.destroy();
    this.currentLevelId = level.id;
    this.lastAutoSaveDay = 0;
    this.completionRecorded = false;

    const save = resume ? SaveManager.loadGame() : undefined;
    const compatibleSave = save?.levelId === level.id ? save : undefined;
    if (!resume) SaveManager.clearGame();

    this.dashboard = new Dashboard(this.root, {
      onBuild: (configId) => this.game?.build(configId) ?? { ok: false, reason: '游戏尚未启动' },
      onUpgrade: (instanceId) => this.game?.upgrade(instanceId) ?? { ok: false, reason: '游戏尚未启动' },
      onToggleBuilding: (instanceId) => this.game?.toggleBuilding(instanceId) ?? { ok: false, reason: '游戏尚未启动' },
      onResearch: (technologyId) => this.game?.research(technologyId) ?? { ok: false, reason: '游戏尚未启动' },
      onPolicy: (policyId) => this.game?.setPolicy(policyId) ?? { ok: false, reason: '游戏尚未启动' },
      onSpeedChange: (speed) => this.game?.setSpeed(speed),
      onPriceChange: (price) => this.game?.setPowerPrice(price),
      onSave: () => this.saveCurrentGame(),
      onLoad: () => this.loadCurrentSave(),
      onMenu: () => this.showCampaign(),
      onRetry: () => this.retryCurrentLevel(),
      onNext: () => this.startNextLevel()
    });

    this.game = new GameManager(
      level,
      this.buildings,
      this.events,
      this.technologies,
      this.policies,
      (view) => this.handleView(view),
      compatibleSave
    );
    this.game.start();
  }

  private handleView(view: GameViewModel): void {
    if (view.state.completed && !this.completionRecorded) {
      SaveManager.markCompleted(view.level.id, view.state.score);
      SaveManager.clearGame();
      this.completionRecorded = true;
    } else if (!view.state.completed && !view.state.failed && view.state.day > this.lastAutoSaveDay) {
      this.saveCurrentGame();
      this.lastAutoSaveDay = view.state.day;
    }

    this.dashboard?.render(view);
  }

  private saveCurrentGame(): { ok: boolean; message: string } {
    if (!this.game) return { ok: false, message: '当前没有可保存的城市' };
    const ok = SaveManager.saveGame(this.game.createSave());
    return { ok, message: ok ? '城市进度已保存' : '浏览器阻止了本地存档' };
  }

  private loadCurrentSave(): { ok: boolean; message: string } {
    const save = SaveManager.loadGame();
    if (!save) return { ok: false, message: '没有找到可读取的存档' };
    this.startLevel(save.levelId, true);
    return { ok: true, message: '存档已读取' };
  }

  private retryCurrentLevel(): void {
    if (!this.currentLevelId) return;
    SaveManager.clearGame();
    this.startLevel(this.currentLevelId, false);
  }

  private startNextLevel(): void {
    if (!this.currentLevelId) return;
    const current = this.levels.find((level) => level.id === this.currentLevelId);
    if (!current) return;
    const next = LevelProgressionSystem.getNextLevel(current, this.levels);
    if (next) this.startLevel(next.id, false);
    else this.showCampaign();
  }
}
