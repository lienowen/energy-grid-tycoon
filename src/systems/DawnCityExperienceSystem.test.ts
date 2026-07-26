import { describe, expect, it } from 'vitest';
import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import { createInitialState, type GameState } from '../core/GameState';
import { DawnCityExperienceSystem, type DawnCityExperienceContext } from './DawnCityExperienceSystem';
import type { TechnologyConfig } from './ResearchSystem';

const gas = {
  id: 'gas_basic',
  name: '燃气应急电站',
  category: 'generation',
  assetId: 'building_gas',
  cost: 1300,
  maintenance: 20,
  power: 520,
  pollution: 8,
  description: '',
  placementZones: ['industrial'],
  maxLevel: 4,
  upgradeCostFactor: 1.68,
  upgradePowerBonus: 0.2,
  upgradeMaintenanceBonus: 0.14
} as BuildingConfig;

const battery = {
  id: 'battery_basic',
  name: '城市备用电站',
  category: 'storage',
  assetId: 'building_battery',
  cost: 1100,
  maintenance: 8,
  power: 260,
  capacity: 900,
  chargeRate: 260,
  dischargeRate: 300,
  efficiency: 0.88,
  pollution: 0,
  description: '',
  placementZones: ['utility'],
  maxLevel: 4,
  upgradeCostFactor: 1.58,
  upgradePowerBonus: 0.2,
  upgradeCapacityBonus: 0.32,
  upgradeMaintenanceBonus: 0.1
} as BuildingConfig;

const technology: TechnologyConfig = {
  id: 'solar_forecasting',
  name: '提前看懂天气',
  description: '',
  assetId: 'tech_solar',
  cost: 28,
  prerequisites: [],
  effects: { generationMultiplier: 1.08 }
};

const makeState = (): GameState => createInitialState({
  levelId: 'city-01',
  cityName: '曙光新城',
  money: 5200,
  population: 4200,
  baseDemand: 720,
  powerPrice: 0.42,
  researchPoints: 12,
  gridEdgeEnabled: {
    'east-to-industrial': false,
    'west-to-industrial-tie': false
  },
  gridEdgeFaulted: { 'east-to-industrial': true }
});

const makeContext = (state: GameState, buildings: readonly BuildingBase[] = []): DawnCityExperienceContext => ({
  state,
  buildings,
  availableBuildings: [gas, battery],
  technologies: [technology],
  goalProgress: 0.4
});

describe('DawnCityExperienceSystem', () => {
  it('guides transfer, repair, and normal configuration before generation expansion', () => {
    const state = makeState();
    state.supplyRatio = 0.35;

    expect(DawnCityExperienceSystem.evaluate(makeContext(state))?.action).toEqual({
      type: 'gridOperation',
      edgeId: 'west-to-industrial-tie',
      operation: 'toggle'
    });

    state.gridEdgeEnabled = {
      ...(state.gridEdgeEnabled ?? {}),
      'west-to-industrial-tie': true
    };
    expect(DawnCityExperienceSystem.evaluate(makeContext(state))?.action).toEqual({
      type: 'gridOperation',
      edgeId: 'east-to-industrial',
      operation: 'repair'
    });

    state.gridEdgeFaulted = { 'east-to-industrial': false };
    state.gridEdgeEnabled = {
      ...(state.gridEdgeEnabled ?? {}),
      'east-to-industrial': true
    };
    expect(DawnCityExperienceSystem.evaluate(makeContext(state))?.action).toEqual({
      type: 'gridOperation',
      edgeId: 'west-to-industrial-tie',
      operation: 'toggle'
    });

    state.gridEdgeEnabled = {
      ...(state.gridEdgeEnabled ?? {}),
      'west-to-industrial-tie': false
    };
    expect(DawnCityExperienceSystem.evaluate(makeContext(state))?.action).toEqual({
      type: 'build',
      buildingId: 'gas_basic'
    });
  });

  it('moves from stable supply to storage after the fault loop is complete', () => {
    const state = makeState();
    state.gridEdgeFaulted = { 'east-to-industrial': false };
    state.gridEdgeEnabled = {
      'east-to-industrial': true,
      'west-to-industrial-tie': false
    };
    state.supplyRatio = 1;

    const beat = DawnCityExperienceSystem.evaluate(makeContext(state));

    expect(beat?.id).toBe('store');
    expect(beat?.action).toEqual({ type: 'build', buildingId: 'battery_basic' });
  });

  it('waits for development points and opens research when ready', () => {
    const state = makeState();
    state.gridEdgeFaulted = { 'east-to-industrial': false };
    state.gridEdgeEnabled = {
      'east-to-industrial': true,
      'west-to-industrial-tie': false
    };
    state.supplyRatio = 1;
    state.storageCapacity = 900;

    expect(DawnCityExperienceSystem.evaluate(makeContext(state))?.action).toEqual({ type: 'wait' });

    state.researchPoints = 28;
    expect(DawnCityExperienceSystem.evaluate(makeContext(state))?.action).toEqual({
      type: 'openPanel',
      panel: 'research'
    });
  });

  it('finishes with a profitability promise tied to the next city', () => {
    const state = makeState();
    state.gridEdgeFaulted = { 'east-to-industrial': false };
    state.gridEdgeEnabled = {
      'east-to-industrial': true,
      'west-to-industrial-tie': false
    };
    state.supplyRatio = 1;
    state.storageCapacity = 900;
    state.unlockedTechnologyIds = ['solar_forecasting'];

    const beat = DawnCityExperienceSystem.evaluate(makeContext(state));

    expect(beat?.id).toBe('prosper');
    expect(beat?.nextPromise).toContain('工业走廊');
  });

  it('does not override later cities', () => {
    const state = makeState();
    state.levelId = 'city-02';
    expect(DawnCityExperienceSystem.evaluate(makeContext(state))).toBeUndefined();
  });
});
