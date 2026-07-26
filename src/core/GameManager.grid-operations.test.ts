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

describe('GameManager grid operations', () => {
  it('restores an isolated industrial district without advancing time or economy', () => {
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
    expect(industrialSupplyRatio(isolatedView)).toBe(0);
    expect(
      isolatedView.lastPower?.gridDispatch?.edges.find(
        (edge) => edge.edgeId === 'east-to-industrial'
      )?.status
    ).toBe('offline');

    const beforeOperation = {
      day: isolatedView.state.day,
      hour: isolatedView.state.hour,
      money: isolatedView.state.money,
      score: isolatedView.state.score,
      totalRevenue: isolatedView.state.totalRevenue,
      totalEnergyServed: isolatedView.state.totalEnergyServed,
      totalShortage: isolatedView.state.totalShortage
    };

    expect(manager.toggleGridEdge('east-to-industrial')).toEqual({ ok: true });
    const restoredView = latestView!;
    expect(restoredView.state.gridEdgeEnabled?.['east-to-industrial']).toBe(true);
    expect(industrialSupplyRatio(restoredView)).toBeGreaterThan(0);
    expect(
      restoredView.lastPower?.gridDispatch?.edges.find(
        (edge) => edge.edgeId === 'east-to-industrial'
      )?.status
    ).not.toBe('offline');
    expect({
      day: restoredView.state.day,
      hour: restoredView.state.hour,
      money: restoredView.state.money,
      score: restoredView.state.score,
      totalRevenue: restoredView.state.totalRevenue,
      totalEnergyServed: restoredView.state.totalEnergyServed,
      totalShortage: restoredView.state.totalShortage
    }).toEqual(beforeOperation);

    const save = manager.createSave();
    expect(save.state.gridEdgeEnabled?.['east-to-industrial']).toBe(true);
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

    const before = manager.createSave().state.gridEdgeEnabled;
    expect(manager.toggleGridEdge('missing-edge')).toEqual({
      ok: false,
      reason: '没有找到这条电网线路'
    });
    expect(manager.createSave().state.gridEdgeEnabled).toEqual(before);
  });
});
