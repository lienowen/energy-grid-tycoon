import { describe, expect, it } from 'vitest';
import type { CityPlotConfig } from '../core/CityMapConfig';
import {
  calculateCityGrowth,
  makeCitizenFeedback,
  makeExpansionSites
} from './CityFeedbackVisuals';
import type { DistrictSceneState } from './CitySceneTypes';

const plots: CityPlotConfig[] = [
  { id: 'north', x: 30, y: 28, zone: 'neighborhood', accepts: ['generation', 'storage'] },
  { id: 'west', x: 20, y: 64, zone: 'industrial', accepts: ['generation'] },
  { id: 'south', x: 52, y: 78, zone: 'outskirts', accepts: ['generation', 'storage'] },
  { id: 'east', x: 78, y: 58, zone: 'utility', accepts: ['storage', 'grid'] }
];

const districts: DistrictSceneState[] = [
  {
    id: 'neighborhood',
    label: '居民社区',
    x: -12,
    z: -8,
    elevation: 0,
    radiusX: 12,
    radiusZ: 8,
    powerRatio: 0.55,
    demandIntensity: 0.92,
    populationShare: 0.7
  },
  {
    id: 'industrial',
    label: '产业区',
    x: 14,
    z: 7,
    elevation: 0,
    radiusX: 10,
    radiusZ: 7,
    powerRatio: 0.8,
    demandIntensity: 0.72,
    populationShare: 0.3
  }
];

describe('city growth visuals', () => {
  it('moves through stable growth stages as population and days advance', () => {
    const start = calculateCityGrowth({ initialPopulation: 4000, population: 4000, day: 1 });
    const later = calculateCityGrowth({ initialPopulation: 4000, population: 6100, day: 8 });
    const repeat = calculateCityGrowth({ initialPopulation: 4000, population: 6100, day: 8 });

    expect(start.stage).toBe(1);
    expect(later.stage).toBeGreaterThan(start.stage);
    expect(repeat).toEqual(later);
  });

  it('creates deterministic expansion sites only after the city begins growing', () => {
    const start = makeExpansionSites('city-test', plots, { stage: 1, progress: 0.02, label: '城市起步' });
    const grown = makeExpansionSites('city-test', plots, { stage: 3, progress: 0.62, label: '城市成形' });
    const repeat = makeExpansionSites('city-test', plots, { stage: 3, progress: 0.62, label: '城市成形' });

    expect(start).toEqual([]);
    expect(grown.length).toBe(2);
    expect(repeat).toEqual(grown);
  });
});

describe('resident feedback visuals', () => {
  it('prioritizes plain-language blackout feedback when power is short', () => {
    const feedback = makeCitizenFeedback({
      levelId: 'city-test',
      day: 2,
      hour: 20,
      satisfaction: 70,
      pollutionRatio: 0.2,
      supplyRatio: 0.58,
      demandRatio: 1.25,
      districts
    });

    expect(feedback[0]?.tone).toBe('danger');
    expect(feedback[0]?.message).toContain('暗');
  });

  it('returns the same feedback for the same simulated time bucket', () => {
    const input = {
      levelId: 'city-test',
      day: 4,
      hour: 11.4,
      satisfaction: 82,
      pollutionRatio: 0.18,
      supplyRatio: 1,
      demandRatio: 0.9,
      districts
    } as const;

    expect(makeCitizenFeedback(input)).toEqual(makeCitizenFeedback(input));
  });
});
