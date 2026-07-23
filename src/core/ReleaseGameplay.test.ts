import { describe, expect, it } from 'vitest';
import buildingData from '../data/buildings.json';
import eventData from '../data/events.json';
import levelData from '../data/levels.json';
import policyData from '../data/policies.json';
import technologyData from '../data/technologies.json';
import type { BuildingConfig } from '../buildings/BuildingBase';
import { CityMapSystem } from '../systems/CityMapSystem';
import type { EventConfig } from '../systems/EventSystem';
import { LevelLoader, type LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { GameManager, type GameViewModel } from './GameManager';

const levels = levelData as unknown as LevelConfig[];
const buildings = buildingData as unknown as BuildingConfig[];
const events = eventData as unknown as EventConfig[];
const technologies = technologyData as unknown as TechnologyConfig[];
const policies = policyData as unknown as PolicyConfig[];

const capture = () => {
  let latest: GameViewModel | undefined;
  return {
    receive: (view: GameViewModel) => { latest = view; },
    latest: (): GameViewModel => {
      if (!latest) throw new Error('Game view was not emitted');
      return latest;
    }
  };
};

describe('market release gameplay smoke', () => {
  it('builds, manages, saves and restores a configured city without level branches', () => {
    const level = levels[0];
    if (!level) throw new Error('Release requires at least one configured level');

    const bootstrap = capture();
    const seedManager = new GameManager(
      level,
      buildings,
      events,
      technologies,
      policies,
      bootstrap.receive
    );
    const richSave = seedManager.createSave();
    richSave.state.money = 1_000_000;
    richSave.state.researchPoints = 1_000_000;

    const session = capture();
    const manager = new GameManager(
      level,
      buildings,
      events,
      technologies,
      policies,
      session.receive,
      richSave
    );
    manager.setSpeed(0);

    const initial = session.latest();
    const initialIds = new Set(initial.buildings.map((building) => building.instanceId));
    const plots = LevelLoader.getWorldPlots(level);
    const placement = initial.availableBuildings.flatMap((config) =>
      plots.map((plot) => ({ config, plot }))
    ).find(({ config, plot }) => CityMapSystem.canPlace(config, plot, initial.buildings).ok);

    expect(placement, 'At least one release level needs a valid build action').toBeDefined();
    if (!placement) return;

    const moneyBeforeBuild = initial.state.money;
    expect(manager.build(placement.config.id, placement.plot.id)).toEqual({ ok: true });

    const afterBuild = session.latest();
    const built = afterBuild.buildings.find((building) => !initialIds.has(building.instanceId));
    expect(built?.placementId).toBe(placement.plot.id);
    expect(afterBuild.state.money).toBe(moneyBeforeBuild - placement.config.cost);
    expect(manager.build(placement.config.id, placement.plot.id).ok).toBe(false);

    if (!built) throw new Error('Successful build did not create a facility');
    expect(manager.upgrade(built.instanceId)).toEqual({ ok: true });
    expect(session.latest().buildings.find((item) => item.instanceId === built.instanceId)?.level).toBe(2);

    expect(manager.toggleBuilding(built.instanceId)).toEqual({ ok: true });
    expect(session.latest().buildings.find((item) => item.instanceId === built.instanceId)?.enabled).toBe(false);

    const save = manager.createSave();
    const restoredSession = capture();
    const restored = new GameManager(
      level,
      buildings,
      events,
      technologies,
      policies,
      restoredSession.receive,
      save
    );
    restored.setSpeed(0);

    const restoredBuilding = restoredSession.latest().buildings.find(
      (item) => item.instanceId === built.instanceId
    );
    expect(restoredBuilding?.placementId).toBe(placement.plot.id);
    expect(restoredBuilding?.level).toBe(2);
    expect(restoredBuilding?.enabled).toBe(false);
    expect(restoredSession.latest().state.money).toBe(save.state.money);
  });

  it('can instantiate and serialize every configured market level', () => {
    expect(levels.length).toBeGreaterThan(0);
    for (const level of levels) {
      const session = capture();
      const manager = new GameManager(
        level,
        buildings,
        events,
        technologies,
        policies,
        session.receive
      );
      manager.setSpeed(0);
      const view = session.latest();
      const save = manager.createSave();

      expect(view.level.id).toBe(level.id);
      expect(view.state.levelId).toBe(level.id);
      expect(save.levelId).toBe(level.id);
      expect(save.buildings.length).toBe(view.buildings.length);
      expect(LevelLoader.getWorldPlots(level).length).toBeGreaterThan(view.buildings.length);
    }
  });
});
