import type { BuildingConfig } from '../buildings/BuildingBase';
import { AssetManager } from '../resources/AssetManager';
import { LevelAssetPlanner } from '../resources/LevelAssetPlanner';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import { LevelProgressionSystem } from '../systems/LevelProgressionSystem';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { LevelSelect } from '../ui/LevelSelect';
import { LoadingScreen } from '../ui/LoadingScreen';
import { MayorDashboard } from '../ui/MayorDashboard';
import { ReleaseOnboarding } from '../ui/ReleaseOnboarding';
import { GameManager, type GameActionResult, type GameViewModel } from './GameManager';
import { SaveManager } from './SaveManager';

export class AppController {
  private game?: GameManager;
  private dashboard?: MayorDashboard;
  private onboarding?: ReleaseOnboarding;
  private currentLevelId?: string;
  private lastAutoSaveDay = 0;
  private completionRecorded = false;
  private loadGeneration = 0;
  private pendingSystemNotice = '';

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
    window.addEventListener('pagehide', this.handlePageHide);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  emergencySave(): boolean {
    if (!this.game) return false;
    return SaveManager.saveGame(this.game.createSave());
  }

  private showCampaign(): void {
    this.loadGeneration += 1;
    this.onboarding?.destroy();
    this.dashboard?.destroy();
    this.game?.destroy();
    this.onboarding = undefined;
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
      onStart: (levelId) => { void this.startLevel(levelId, false); },
      onContinue: (levelId) => { void this.startLevel(levelId, true); }
    }).render(items);
  }

  private async startLevel(levelId: string, resume: boolean): Promise<void> {
    const level = this.levels.find((item) => item.id === levelId);
    if (!level) return;

    const generation = ++this.loadGeneration;
    this.onboarding?.destroy();
    this.dashboard?.destroy();
    this.game?.destroy();
    this.onboarding = undefined;
    this.game = undefined;
    this.dashboard = undefined;
    this.currentLevelId = level.id;
    this.lastAutoSaveDay = 0;
    this.completionRecorded = false;
    this.pendingSystemNotice = '';

    LoadingScreen.render(this.root, `正在前往${level.name}`, '正在铺开城市地图和可建设用地。');
    const assetReport = await AssetManager.preload(LevelAssetPlanner.resolve(level, {
      buildings: this.buildings,
      events: this.events,
      technologies: this.technologies,
      policies: this.policies
    }));
    if (generation !== this.loadGeneration) return;
    if (assetReport.failed.length > 0) console.warn('Level assets failed to preload:', assetReport.failed);

    const save = resume ? SaveManager.loadGame() : undefined;
    const compatibleSave = save?.levelId === level.id ? save : undefined;
    if (!resume) SaveManager.clearGame();
    if (SaveManager.consumeRecoveryNotice()) {
      this.pendingSystemNotice = '主存档校验失败，已经自动恢复到上一份安全备份。';
    }

    this.dashboard = new MayorDashboard(this.root, {
      onBuild: (configId: string, plotId?: string) => {
        const result = this.game?.build(configId, plotId) ?? this.notReady();
        if (result.ok) this.onboarding?.record('buildPlaced');
        return result;
      },
      onUpgrade: (instanceId) => {
        const result = this.game?.upgrade(instanceId) ?? this.notReady();
        if (result.ok) this.onboarding?.record('facilityManaged');
        return result;
      },
      onToggleBuilding: (instanceId) => {
        const result = this.game?.toggleBuilding(instanceId) ?? this.notReady();
        if (result.ok) this.onboarding?.record('facilityManaged');
        return result;
      },
      onResearch: (technologyId) => this.game?.research(technologyId) ?? this.notReady(),
      onPolicy: (policyId) => this.game?.setPolicy(policyId) ?? this.notReady(),
      onSpeedChange: (speed) => {
        this.game?.setSpeed(speed);
        if (speed > 0) this.onboarding?.record('speedChanged');
      },
      onPriceChange: (price) => this.game?.setPowerPrice(price),
      onSave: () => this.saveCurrentGame(),
      onLoad: () => this.loadCurrentSave(),
      onMenu: () => this.showCampaign(),
      onRetry: () => this.retryCurrentLevel(),
      onNext: () => this.startNextLevel()
    });
    this.onboarding = new ReleaseOnboarding(this.root);

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
    this.onboarding?.render(view);
    if (this.pendingSystemNotice) {
      this.onboarding?.announce(this.pendingSystemNotice);
      this.pendingSystemNotice = '';
    }
  }

  private saveCurrentGame(): { ok: boolean; message: string } {
    if (!this.game) return { ok: false, message: '当前没有可保存的城市' };
    const ok = SaveManager.saveGame(this.game.createSave());
    return { ok, message: ok ? '城市进度和安全备份已经保存' : '浏览器阻止了本地保存' };
  }

  private loadCurrentSave(): { ok: boolean; message: string } {
    const save = SaveManager.loadGame();
    if (!save) return { ok: false, message: '没有找到之前保存的城市进度' };
    void this.startLevel(save.levelId, true);
    return { ok: true, message: '正在回到上次保存的位置' };
  }

  private retryCurrentLevel(): void {
    if (!this.currentLevelId) return;
    SaveManager.clearGame();
    void this.startLevel(this.currentLevelId, false);
  }

  private startNextLevel(): void {
    if (!this.currentLevelId) return;
    const current = this.levels.find((level) => level.id === this.currentLevelId);
    if (!current) return;
    const next = LevelProgressionSystem.getNextLevel(current, this.levels);
    if (next) void this.startLevel(next.id, false);
    else this.showCampaign();
  }

  private notReady(): GameActionResult {
    return { ok: false, reason: '城市还没有准备好' };
  }

  private readonly handlePageHide = (): void => {
    this.emergencySave();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.emergencySave();
  };

  private readonly handleBeforeUnload = (): void => {
    this.emergencySave();
    this.onboarding?.destroy();
    this.dashboard?.destroy();
    this.game?.destroy();
  };
}
