import { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import { EconomyResult } from '../systems/EconomySystem';
import { ActiveEvent, EventConfig, EventSystem } from '../systems/EventSystem';
import { GoalSystem } from '../systems/GoalSystem';
import { LevelConfig, LevelLoader, LoadedLevel } from '../systems/LevelLoader';
import { PowerResult } from '../systems/PowerSystem';
import { SimulationSystem } from '../systems/SimulationSystem';
import { StorageResult } from '../systems/StorageSystem';
import { GameSpeed, GameState } from './GameState';
import { GameSave } from './SaveManager';

export interface GameViewModel {
  state: GameState;
  level: LevelConfig;
  availableBuildings: BuildingConfig[];
  buildings: readonly ReturnType<typeof BuildingFactory.create>[];
  activeEvent?: ActiveEvent;
  lastPower?: PowerResult;
  lastEconomy?: EconomyResult;
  lastStorage?: StorageResult;
  goalProgress: number;
}

export class GameManager {
  private readonly session: LoadedLevel;
  private readonly events: EventConfig[];
  private readonly eventSystem = new EventSystem();
  private timer?: number;
  private lastPower?: PowerResult;
  private lastEconomy?: EconomyResult;
  private lastStorage?: StorageResult;

  constructor(
    level: LevelConfig,
    buildingConfigs: BuildingConfig[],
    eventConfigs: EventConfig[],
    private readonly onChange: (view: GameViewModel) => void,
    save?: GameSave
  ) {
    this.session = save?.levelId === level.id
      ? LevelLoader.restore(level, buildingConfigs, save.state, save.buildings)
      : LevelLoader.load(level, buildingConfigs);
    this.events = eventConfigs;
    this.eventSystem.restore(save?.activeEvent, eventConfigs);
  }

  start(): void {
    if (this.timer !== undefined) return;
    this.emit();
    this.timer = window.setInterval(() => this.tick(), 1000);
  }

  destroy(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }

  setSpeed(speed: GameSpeed): void {
    if (this.session.state.completed || this.session.state.failed) return;
    this.session.state.speed = speed;
    this.emit();
  }

  setPowerPrice(price: number): void {
    if (this.session.state.completed || this.session.state.failed) return;
    this.session.state.powerPrice = Math.min(1.2, Math.max(0.15, price));
    this.emit();
  }

  build(configId: string): { ok: boolean; reason?: string } {
    const state = this.session.state;
    if (state.completed || state.failed) return { ok: false, reason: '本局已经结束' };

    const level = this.session.config;
    if (!level.availableBuildings.includes(configId)) {
      return { ok: false, reason: '该建筑尚未解锁' };
    }

    const config = this.session.buildingCatalog.get(configId);
    if (!config) return { ok: false, reason: '建筑配置不存在' };
    if (state.money < config.cost) return { ok: false, reason: '资金不足' };

    state.money -= config.cost;
    this.session.buildings.add(BuildingFactory.create(config));
    state.storageCapacity = this.session.buildings.getTotalStorageCapacity();
    state.storageEnergy = this.session.buildings.getTotalStoredEnergy();
    this.emit();
    return { ok: true };
  }

  createSave(): GameSave {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      levelId: this.session.config.id,
      state: { ...this.session.state },
      buildings: this.session.buildings.toSnapshots(),
      activeEvent: this.eventSystem.getSnapshot()
    };
  }

  private tick(): void {
    const state = this.session.state;
    if (state.speed === 0 || state.completed || state.failed) return;

    this.eventSystem.advance(state.speed);
    this.eventSystem.maybeTrigger(this.session.config.eventPool, this.events, 0.1);

    const result = SimulationSystem.tick(
      state,
      this.session.buildings,
      this.eventSystem.getEffects(),
      state.speed
    );

    Object.assign(state, result.state, {
      activeEventId: this.eventSystem.getActive()?.config.id
    });

    state.completed = GoalSystem.isCompleted(state, this.session.config);
    state.failed = GoalSystem.isFailed(state, this.session.config);
    if (state.completed || state.failed) state.speed = 0;

    this.lastPower = result.power;
    this.lastEconomy = result.economy;
    this.lastStorage = result.storage;
    this.emit();
  }

  private emit(): void {
    const level = this.session.config;
    const availableBuildings = level.availableBuildings
      .map((id) => this.session.buildingCatalog.get(id))
      .filter((item): item is BuildingConfig => Boolean(item));

    this.onChange({
      state: { ...this.session.state },
      level,
      availableBuildings,
      buildings: this.session.buildings.getBuildings(),
      activeEvent: this.eventSystem.getActive(),
      lastPower: this.lastPower,
      lastEconomy: this.lastEconomy,
      lastStorage: this.lastStorage,
      goalProgress: GoalSystem.getProgress(this.session.state, level)
    });
  }
}
