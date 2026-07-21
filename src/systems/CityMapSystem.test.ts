import { describe, expect, it } from 'vitest';
import type { BuildingConfig } from '../buildings/BuildingBase';
import { BuildingFactory } from '../buildings/BuildingFactory';
import type { CityPlotConfig } from '../core/CityMapConfig';
import { CityMapSystem } from './CityMapSystem';

const solar: BuildingConfig = {
  id: 'solar',
  name: '社区太阳能',
  category: 'generation',
  assetId: 'building_solar',
  cost: 100,
  maintenance: 1,
  power: 50,
  pollution: 0,
  description: '测试项目',
  placementZones: ['neighborhood', 'outskirts']
};

const battery: BuildingConfig = {
  id: 'battery',
  name: '城市备用电站',
  category: 'storage',
  assetId: 'building_battery',
  cost: 100,
  maintenance: 1,
  power: 30,
  capacity: 200,
  pollution: 0,
  description: '测试项目',
  placementZones: ['utility']
};

const neighborhood: CityPlotConfig = {
  id: 'homes',
  x: 20,
  y: 30,
  zone: 'neighborhood',
  accepts: ['generation', 'storage']
};

const utility: CityPlotConfig = {
  id: 'utility',
  x: 70,
  y: 60,
  zone: 'utility',
  accepts: ['generation', 'storage', 'grid']
};

describe('CityMapSystem', () => {
  it('allows a compatible facility on an empty city plot', () => {
    expect(CityMapSystem.canPlace(solar, neighborhood, [])).toEqual({ ok: true });
  });

  it('rejects a facility when the zone does not fit the project', () => {
    expect(CityMapSystem.canPlace(battery, neighborhood, []).ok).toBe(false);
  });

  it('rejects a plot that already contains a facility', () => {
    const existing = BuildingFactory.create(solar);
    existing.place(neighborhood.id);

    expect(CityMapSystem.canPlace(solar, neighborhood, [existing]).ok).toBe(false);
  });

  it('assigns configured starting facilities and fills remaining gaps', () => {
    const first = BuildingFactory.create(solar);
    const second = BuildingFactory.create(battery);

    CityMapSystem.assignStartingBuildings(
      [first, second],
      [neighborhood, utility],
      [{ buildingId: solar.id, plotId: neighborhood.id }]
    );

    expect(first.placementId).toBe(neighborhood.id);
    expect(second.placementId).toBe(utility.id);
  });

  it('keeps the chosen plot when a facility is saved and restored', () => {
    const placed = BuildingFactory.create(solar);
    placed.place(neighborhood.id);

    const restored = BuildingFactory.create(solar, placed.toSnapshot());

    expect(restored.placementId).toBe(neighborhood.id);
    expect(restored.toSnapshot()).toEqual(placed.toSnapshot());
  });

  it('keeps legacy snapshots free of empty placement fields', () => {
    const building = BuildingFactory.create(solar);

    expect(building.toSnapshot()).not.toHaveProperty('placementId');
  });
});
