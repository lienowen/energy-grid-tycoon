import { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import { BuildingUpgradeSystem, type UpgradeQuote } from '../systems/BuildingUpgradeSystem';
import { EconomyResult } from '../systems/EconomySystem';
import { ActiveEvent, EventConfig, EventSystem } from '../systems/EventSystem';
import { GoalSystem } from '../systems/GoalSystem';
import { LevelConfig, LevelLoader, LoadedLevel } from '../systems/LevelLoader';
import { PolicyConfig, PolicySystem } from '../systems/PolicySystem';
import { PowerResult } from '../systems/PowerSystem';
import { ResearchSystem, TechnologyConfig } from '../systems/ResearchSystem';
import {
  mergeSimulationModifiers,
  type SimulationModifiers
} from '../systems/SimulationModifiers';
import { SimulationSystem } from '../systems/SimulationSystem';
import { StorageResult } from '../systems/StorageSystem';
import { TelemetryPoint, TelemetrySystem } from '../systems/TelemetrySystem';
import { GameSpeed, GameState } from './GameState';
import { GameSave } from './SaveManager';

export interface GameViewModel {
  state: GameState;
  level: LevelConfig;
  availableBuildings: BuildingConfig[];
  technologies: TechnologyConfig[];
  policies: PolicyConfig[];
  activePolicy?: PolicyConfig;
  buildings: readonly ReturnType<typeof BuildingFactory.create>[];
  upgradeQuotes: Record<string, UpgradeQuote>;
  activeEvent?: ActiveEvent;
  lastPower?: PowerResult;
  lastEconomy?: EconomyResult;
  lastStorage?: StorageResult;
  goalProgress: number;
  telemetry: readonly TelemetryPoint[];
  modifiers: SimulationModifiers;
  researchPerHour: number;
}

export interface GameActionResult {
  ok: boolean;
  reason?: string;
}

export class GameManager {
  private readonly session: LoadedLevel;
  private readonly events: EventConfig[];
  private readonly technologies: TechnologyConfig[];
  private readonly policies: PolicyConfig[];
  private readonly eventSystem = new EventSystem();
  private readonly telemetry: TelemetrySystem;
  private timer?: number;
  private lastPower?: PowerResult;
  private lastEconomy?: EconomyResult;
  private lastStorage?: StorageResult;

  constructor(
    level: LevelConfig,
    buildingConfigs: BuildingConfig[],
    eventConfigs: EventConfig[],
    technologyConfigs: TechnologyConfig[],
    policyConfigs: PolicyConfig[],
    private readonly onChange: (view: GameViewModel) => void,
    save?: GameSave
  ) {
    this.session = save?.levelId === level.id
      ? LevelLoader.restore(level, buildingConfigs, save.state, save.buildings)
      : LevelLoader.load(level, buildingConfigs);
    this.events = eventConfigs;
    this.technologies = technologyConfigs;
    this.policies = policyConfigs;
    this.eventSystem.restore(save?.activeEvent, eventConfigs);
    this.telemetry = new TelemetrySystem(save?.telemetry ?? []);
    this.refreshStorageState();
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

  build(configId: string): GameActionResult {
    const state = this.session.state;
    if (state.completed || state.failed) return { ok: false, reason: '本局已经结束' };

    const level = this.session.config;
    if (!level.availableBuildings.includes(configId)) {
      return { ok: false, reason: '该建筑不属于当前城市规划' };
    }

    const config = this.session.buildingCatalog.get(configId);
    if (!config) return { ok: false, reason: '建筑配置不存在' };
    if (
      config.requiredTechnologyId
      && !state.unlockedTechnologyIds.includes(config.requiredTechnologyId)
    ) {
      return { ok: false, reason: '需要先完成对应科技研发' };
    }
    if (state.money < config.cost) return { ok: false, reason: '资金不足' };

    state.money -= config.cost;
    this.session.buildings.add(BuildingFactory.create(config));
    this.refreshStorageState();
    this.emit();
    return { ok: true };
  }

  upgrade(instanceId: string): GameActionResult {
    const state = this.session.state;
    if (state.completed || state.failed) return { ok: false, reason: '本局已经结束' };
    const building = this.session.buildings.find(instanceId);
    if (!building) return { ok: false, reason: '没有找到该建筑' };

    const quote = BuildingUpgradeSystem.quote(building);
    if (!quote.available) return { ok: false, reason: quote.reason };
    if (state.money < quote.cost) return { ok: false, reason: '升级资金不足' };

    state.money -= quote.cost;
    BuildingUpgradeSystem.upgrade(building);
    this.refreshStorageState();
    this.emit();
    return { ok: true };
  }

  toggleBuilding(instanceId: string): GameActionResult {
    const state = this.session.state;
    if (state.completed || state.failed) return { ok: false, reason: '本局已经结束' };
    const building = this.session.buildings.find(instanceId);
    if (!building) return { ok: false, reason: '没有找到该建筑' };
    building.enabled = !building.enabled;
    this.refreshStorageState();
    this.emit();
    return { ok: true };
  }

  research(technologyId: string): GameActionResult {
    const state = this.session.state;
    if (state.completed || state.failed) return { ok: false, reason: '本局已经结束' };
    const technology = this.getAvailableTechnologies().find((item) => item.id === technologyId);
    if (!technology) return { ok: false, reason: '该技术不在当前研发计划中' };

    const check = ResearchSystem.canUnlock(state, technology);
    if (!check.ok) return check;
    state.researchPoints -= technology.cost;
    state.unlockedTechnologyIds = [...state.unlockedTechnologyIds, technology.id];
    this.refreshStorageState();
    this.emit();
    return { ok: true };
  }

  setPolicy(policyId?: string): GameActionResult {
    const state = this.session.state;
    if (state.completed || state.failed) return { ok: false, reason: '本局已经结束' };
    if (!policyId) {
      state.activePolicyId = undefined;
      this.emit();
      return { ok: true };
    }

    const policy = this.getAvailablePolicies().find((item) => item.id === policyId);
    if (!policy) return { ok: false, reason: '该政策在当前城市不可用' };
    const check = PolicySystem.canActivate(state, policy);
    if (!check.ok) return check;

    state.money -= policy.activationCost;
    state.activePolicyId = policy.id;
    this.refreshStorageState();
    this.emit();
    return { ok: true };
  }

  createSave(): GameSave {
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      levelId: this.session.config.id,
      state: {
        ...this.session.state,
        unlockedTechnologyIds: [...this.session.state.unlockedTechnologyIds]
      },
      buildings: this.session.buildings.toSnapshots(),
      activeEvent: this.eventSystem.getSnapshot(),
      telemetry: this.telemetry.toSnapshot()
    };
  }

  private tick(): void {
    const state = this.session.state;
    if (state.speed === 0 || state.completed || state.failed) return;

    this.eventSystem.advance(state.speed);
    this.eventSystem.maybeTrigger(this.session.config.eventPool, this.events, 0.1);
    const modifiers = this.getSimulationModifiers();
    const result = SimulationSystem.tick(
      state,
      this.session.buildings,
      this.eventSystem.getEffects(),
      state.speed,
      modifiers
    );
    result.state.researchPoints += ResearchSystem.calculateResearchGain(
      result.state,
      state.speed,
      modifiers
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
    this.telemetry.record(state, result.economy, result.power);
    this.emit();
  }

  private getAvailableTechnologies(): TechnologyConfig[] {
    const allowed = this.session.config.availableTechnologies;
    return allowed
      ? allowed
        .map((id) => this.technologies.find((item) => item.id === id))
        .filter((item): item is TechnologyConfig => Boolean(item))
      : [...this.technologies];
  }

  private getAvailablePolicies(): PolicyConfig[] {
    const allowed = this.session.config.availablePolicies;
    return allowed
      ? allowed
        .map((id) => this.policies.find((item) => item.id === id))
        .filter((item): item is PolicyConfig => Boolean(item))
      : [...this.policies];
  }

  private getSimulationModifiers(): SimulationModifiers {
    return mergeSimulationModifiers(
      ResearchSystem.getModifiers(
        this.session.state.unlockedTechnologyIds,
        this.technologies
      ),
      PolicySystem.getModifiers(this.session.state.activePolicyId, this.policies)
    );
  }

  private refreshStorageState(): void {
    const modifiers = this.getSimulationModifiers();
    for (const building of this.session.buildings.getStorageBuildings()) {
      building.setStoredEnergy(building.storedEnergy, modifiers.storageCapacityMultiplier);
    }
    this.session.state.storageEnergy = this.session.buildings.getTotalStoredEnergy();
    this.session.state.storageCapacity = this.session.buildings.getTotalStorageCapacity(
      modifiers.storageCapacityMultiplier
    );
  }

  private emit(): void {
    const level = this.session.config;
    const unlocked = new Set(this.session.state.unlockedTechnologyIds);
    const availableBuildings = level.availableBuildings
      .map((id) => this.session.buildingCatalog.get(id))
      .filter((item): item is BuildingConfig => Boolean(item))
      .filter((item) => !item.requiredTechnologyId || unlocked.has(item.requiredTechnologyId));
    const technologies = this.getAvailableTechnologies();
    const policies = this.getAvailablePolicies();
    const modifiers = this.getSimulationModifiers();
    const upgradeQuotes = Object.fromEntries(
      this.session.buildings.getBuildings().map((building) => [
        building.instanceId,
        BuildingUpgradeSystem.quote(building)
      ])
    );

    this.onChange({
      state: {
        ...this.session.state,
        unlockedTechnologyIds: [...this.session.state.unlockedTechnologyIds]
      },
      level,
      availableBuildings,
      technologies,
      policies,
      activePolicy: policies.find((policy) => policy.id === this.session.state.activePolicyId),
      buildings: this.session.buildings.getBuildings(),
      upgradeQuotes,
      activeEvent: this.eventSystem.getActive(),
      lastPower: this.lastPower,
      lastEconomy: this.lastEconomy,
      lastStorage: this.lastStorage,
      goalProgress: GoalSystem.getProgress(this.session.state, level),
      telemetry: this.telemetry.getPoints(),
      modifiers,
      researchPerHour: ResearchSystem.calculateResearchGain(
        this.session.state,
        1,
        modifiers
      )
    });
  }
}
