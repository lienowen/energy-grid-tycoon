import { describe, expect, it } from 'vitest';
import type { BuildingConfig } from './BuildingBase';
import { BuildingBase } from './BuildingBase';
import { BuildingFactory } from './BuildingFactory';

const solarConfig: BuildingConfig = {
  id: 'solar_test',
  name: '测试光伏场',
  category: 'generation',
  assetId: 'commercial_facility_solar_active',
  cost: 1000,
  maintenance: 20,
  power: 120,
  pollution: 2,
  description: '施工生命周期测试'
};

describe('Building construction lifecycle', () => {
  it('keeps a new facility inactive until construction completes', () => {
    const building = new BuildingBase(solarConfig, 'solar-construction');
    building.place('plot-a');
    building.beginConstruction(6);

    expect(building.underConstruction).toBe(true);
    expect(building.constructionProgress).toBe(0);
    expect(building.enabled).toBe(false);
    expect(building.getPowerOutput()).toBe(0);
    expect(building.getMaintenance()).toBe(0);
    expect(building.getPollution()).toBe(0);

    expect(building.advanceConstruction(2)).toBe(false);
    expect(building.constructionProgress).toBeCloseTo(1 / 3);
    expect(building.getPowerOutput()).toBe(0);

    expect(building.advanceConstruction(4)).toBe(true);
    expect(building.underConstruction).toBe(false);
    expect(building.constructionProgress).toBe(1);
    expect(building.enabled).toBe(true);
    expect(building.getPowerOutput()).toBe(120);
    expect(building.getMaintenance()).toBe(20);
  });

  it('persists and restores unfinished construction', () => {
    const source = new BuildingBase(solarConfig, 'solar-save');
    source.place('plot-b');
    source.beginConstruction(8);
    source.advanceConstruction(3);

    const snapshot = source.toSnapshot();
    const restored = BuildingFactory.create(solarConfig, snapshot);

    expect(snapshot.constructionHoursTotal).toBe(8);
    expect(snapshot.constructionHoursRemaining).toBe(5);
    expect(restored.placementId).toBe('plot-b');
    expect(restored.underConstruction).toBe(true);
    expect(restored.constructionProgress).toBeCloseTo(3 / 8);
    expect(restored.enabled).toBe(false);
    expect(restored.advanceConstruction(5)).toBe(true);
    expect(restored.getPowerOutput()).toBe(120);
  });
});
