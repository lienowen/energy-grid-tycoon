import { describe, expect, it } from 'vitest';
import type { BuildingConfig } from '../buildings/BuildingBase';
import buildingData from '../data/buildings.json';
import eventData from '../data/events.json';
import levelData from '../data/levels.json';
import policyData from '../data/policies.json';
import technologyData from '../data/technologies.json';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { GameManager, type GameViewModel } from './GameManager';

const industrialSupplyRatio = (view: GameViewModel): number =>
  view.lastPower?.gridDispatch?.districts.find(
    (district) => district.districtId === 'dawn-industrial'
  )?.supplyRatio ?? -1;

const stableFields = (view: GameViewModel) => ({
  day: view.state.day,
  hour: view.state.hour,
  score: view.state.score,
  totalRevenue: view.state.totalRevenue,
  totalEnergyServed: view.state.totalEnergyServed,
  totalShortage: view.state.totalShortage
});

describe('GameManager grid operations', () => {
  it('uses a limited tie line before repairing the faulted industrial feeder', () => {
    const level = levelData[0] as unknown as LevelConfig;
    let latestView: GameViewModel | undefined;
    const manager = new GameManager(
      level,
      buildingData as unknown as BuildingConfig[],
      eventData as unknown as EventConfig[],
      technologyData as unknown as TechnologyConfig[],
      policyData as unknown as PolicyConfig[],
      (view) => { latestView = view; }
    );

    expect(manager.build('gas_basic', 'west-industry')).toEqual({ ok: true });
    const isolatedView = latestView!;
    expect(isolatedView.state.gridEdgeEnabled?.['east-to-industrial']).toBe(false);
    expect(isolatedView.state.gridEdgeFaulted?.['east-to-industrial']).toBe(true);
    expect(isolatedView.state.gridEdgeEnabled?.['west-to-industrial-tie']).toBe(false);
    expect(industrialSupplyRatio(isolatedView)).toBe(0);
    expect(manager.toggleGridEdge('east-to-industrial')).toEqual({
      ok: false,
      reason: '线路仍在故障，需先抢修'
    });

    const beforeTransfer = stableFields(isolatedView);
    const moneyBeforeTransfer = isolatedView.state.money;
    expect(manager.toggleGridEdge('west-to-industrial-tie')).toEqual({ ok: true });
    const transferView = latestView!;
    const transferRatio = industrialSupplyRatio(transferView);
    expect(transferView.state.gridEdgeEnabled?.['west-to-industrial-tie']).toBe(true);
    expect(transferRatio).toBeGreaterThan(0);
    expect(transferRatio).toBeLessThan(1);
    expect(stableFields(transferView)).toEqual(beforeTransfer);
    expect(transferView.state.money).toBe(moneyBeforeTransfer);

    const moneyBeforeRepair = transferView.state.money;
    expect(manager.repairGridEdge('east-to-industrial')).toEqual({ ok: true });
    const repairedView = latestView!;
    expect(repairedView.state.gridEdgeFaulted?.['east-to-industrial']).toBe(false);
    expect(repairedView.state.gridEdgeEnabled?.['east-to-industrial']).toBe(true);
    expect(industrialSupplyRatio(repairedView)).toBeGreaterThan(transferRatio);
    expect(repairedView.state.money).toBe(moneyBeforeRepair - 320);
    expect(stableFields(repairedView)).toEqual(beforeTransfer);

    const save = manager.createSave();
    expect(save.state.gridEdgeEnabled?.['west-to-industrial-tie']).toBe(true);
    expect(save.state.gridEdgeEnabled?.['east-to-industrial']).toBe(true);
    expect(save.state.gridEdgeFaulted?.['east-to-industrial']).toBe(false);

    const restored = new GameManager(
      level,
      buildingData as unknown as BuildingConfig[],
      eventData as unknown as EventConfig[],
      technologyData as unknown as TechnologyConfig[],
      policyData as unknown as PolicyConfig[],
      () => undefined,
      save
    );
    expect(restored.repairGridEdge('east-to-industrial')).toEqual({
      ok: false,
      reason: '线路当前没有故障'
    });
  });

  it('rejects unknown lines without changing the network state', () => {
    const level = levelData[0] as unknown as LevelConfig;
    const manager = new GameManager(
      level,
      buildingData as unknown as BuildingConfig[],
      eventData as unknown as EventConfig[],
      technologyData as unknown as TechnologyConfig[],
      policyData as unknown as PolicyConfig[],
      () => undefined
    );

    const before = manager.createSave().state;
    expect(manager.toggleGridEdge('missing-edge')).toEqual({
      ok: false,
      reason: '没有找到这条电网线路'
    });
    expect(manager.repairGridEdge('missing-edge')).toEqual({
      ok: false,
      reason: '没有找到这条电网线路'
    });
    const after = manager.createSave().state;
    expect(after.gridEdgeEnabled).toEqual(before.gridEdgeEnabled);
    expect(after.gridEdgeFaulted).toEqual(before.gridEdgeFaulted);
  });
});
