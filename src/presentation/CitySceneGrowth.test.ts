import { describe, expect, it } from 'vitest';
import type { CityPlotConfig } from '../core/CityMapConfig';
import {
  makeAmbientBlocks,
  makeDistricts,
  makeRoads,
  toScenePoint
} from './CitySceneVisuals';

const plots: CityPlotConfig[] = [
  { id: 'north-home', x: 34, y: 26, zone: 'neighborhood', accepts: ['generation', 'storage'] },
  { id: 'east-utility', x: 72, y: 44, zone: 'utility', accepts: ['storage', 'grid'] },
  { id: 'south-industry', x: 48, y: 76, zone: 'industrial', accepts: ['generation'] },
  { id: 'west-outskirts', x: 20, y: 58, zone: 'outskirts', accepts: ['generation', 'storage'] },
  { id: 'coast', x: 82, y: 24, zone: 'coastal', accepts: ['generation'] }
];

describe('living city scene generation', () => {
  it('adds buildings and roads as visual growth increases', () => {
    const startDistricts = makeDistricts(plots, 1, 'residential', 12, 0.9);
    const startBlocks = makeAmbientBlocks('city-growth', plots, startDistricts, 'residential', 0);
    const grownBlocks = makeAmbientBlocks('city-growth', plots, startDistricts, 'residential', 0.8);
    const city = toScenePoint({ x: 50, y: 50 });
    const startRoads = makeRoads('city-growth', plots, city, 4000, 1, 0);
    const grownRoads = makeRoads('city-growth', plots, city, 7800, 1, 0.8);

    expect(grownBlocks.length).toBeGreaterThan(startBlocks.length);
    expect(grownRoads.length).toBeGreaterThan(startRoads.length);
    expect(makeAmbientBlocks('city-growth', plots, startDistricts, 'residential', 0.8)).toEqual(grownBlocks);
  });

  it('moves demand heat between industrial daytime and residential evening', () => {
    const daytime = makeDistricts(plots, 1, 'residential', 13, 1.05);
    const evening = makeDistricts(plots, 1, 'residential', 20, 1.05);
    const dayIndustry = daytime.find((district) => district.id === 'industrial');
    const dayHomes = daytime.find((district) => district.id === 'neighborhood');
    const eveningHomes = evening.find((district) => district.id === 'neighborhood');

    expect(dayIndustry?.demandIntensity).toBeGreaterThan(0.5);
    expect(eveningHomes?.demandIntensity ?? 0).toBeGreaterThan(dayHomes?.demandIntensity ?? 0);
  });
});
