import { describe, expect, it } from 'vitest';
import type { BuildingConfig } from '../buildings/BuildingBase';
import { createInitialState, type GameState } from '../core/GameState';
import { MayorGuidanceSystem, type MayorGuidanceContext } from './MayorGuidanceSystem';
import type { TechnologyConfig } from './ResearchSystem';

const generator: BuildingConfig = {
  id: 'town_generator',
  name: '社区发电站',
  category: 'generation',
  assetId: 'building_gas',
  cost: 600,
  maintenance: 10,
  power: 250,
  pollution: 8,
  description: '为附近居民稳定供电。'
};

const storage: BuildingConfig = {
  id: 'town_storage',
  name: '城市备用电站',
  category: 'storage',
  assetId: 'building_battery',
  cost: 500,
  maintenance: 5,
  power: 100,
  capacity: 600,
  pollution: 0,
  description: '把多余电力留到晚上使用。'
};

const upgrade: TechnologyConfig = {
  id: 'better_city',
  name: '更聪明的城市用电',
  description: '减少浪费。',
  assetId: 'tech_grid',
  cost: 20,
  prerequisites: [],
  effects: { generationMultiplier: 1.05 }
};

const context = (statePatch: Partial<GameState> = {}): MayorGuidanceContext => {
  const state = createInitialState({
    levelId: 'mayor-test',
    cityName: '测试城',
    money: 1000,
    population: 4000,
    baseDemand: 600,
    powerPrice: 0.4,
    satisfaction: 80,
    researchPoints: 0
  });
  Object.assign(state, { supplyRatio: 1 }, statePatch);
  return {
    state,
    buildings: [],
    availableBuildings: [generator, storage],
    technologies: [upgrade],
    goalProgress: 0.2,
    briefing: ['先让全城稳定亮灯']
  };
};

describe('MayorGuidanceSystem', () => {
  it('guides the mayor to add power when residents face outages', () => {
    const guide = MayorGuidanceSystem.evaluate(context({ supplyRatio: 0.72 }));

    expect(guide.headline).toContain('停电');
    expect(guide.action).toEqual({ type: 'build', buildingId: generator.id });
  });

  it('guides the mayor to add backup power before advanced decisions', () => {
    const guide = MayorGuidanceSystem.evaluate(context());

    expect(guide.message).toContain(storage.name);
    expect(guide.action).toEqual({ type: 'build', buildingId: storage.id });
  });

  it('opens city upgrades when enough development points are available', () => {
    const guide = MayorGuidanceSystem.evaluate(context({ storageCapacity: 600, researchPoints: 25 }));

    expect(guide.message).toContain(upgrade.name);
    expect(guide.action).toEqual({ type: 'openPanel', panel: 'research' });
  });

  it('asks for a governing direction after the city becomes stable', () => {
    const guide = MayorGuidanceSystem.evaluate(context({ storageCapacity: 600, day: 2 }));

    expect(guide.headline).toContain('施政方向');
    expect(guide.action).toEqual({ type: 'openPanel', panel: 'policy' });
  });
});
