import { describe, expect, it } from 'vitest';
import type { CityPlotConfig } from '../core/CityMapConfig';
import {
  makeAmbientBlocks,
  makeDistricts,
  makeRoads,
  stableVisualHash,
  toScenePoint
} from './CitySceneVisuals';

const plots: CityPlotConfig[] = [
  {
    id: 'north-home',
    x: 20,
    y: 28,
    zone: 'neighborhood',
    accepts: ['generation', 'storage'],
    label: '北部社区'
  },
  {
    id: 'west-industry',
    x: 18,
    y: 70,
    zone: 'industrial',
    accepts: ['generation', 'storage'],
    label: '西部产业区'
  },
  {
    id: 'east-utility',
    x: 82,
    y: 68,
    zone: 'utility',
    accepts: ['generation', 'storage', 'grid'],
    label: '公共设施区'
  },
  {
    id: 'east-coast',
    x: 84,
    y: 24,
    zone: 'coastal',
    accepts: ['generation'],
    label: '海岸能源区'
  }
];

const city = { x: 0, z: 0, elevation: 1.4 };

describe('CitySceneVisuals', () => {
  it('generates the same city blocks and roads for the same level configuration', () => {
    const districts = makeDistricts(plots, 0.82, 'residential');
    expect(makeRoads('city-test', plots, city, 8200, 0.82)).toEqual(
      makeRoads('city-test', plots, city, 8200, 0.82)
    );
    expect(makeAmbientBlocks('city-test', plots, districts, 'residential')).toEqual(
      makeAmbientBlocks('city-test', plots, districts, 'residential')
    );
  });

  it('turns supply shortage into visible district blackouts in priority order', () => {
    const districts = makeDistricts(plots, 0.45, 'residential');
    const neighborhood = districts.find((district) => district.id === 'neighborhood');
    const industrial = districts.find((district) => district.id === 'industrial');
    expect(neighborhood?.powerRatio).toBeGreaterThan(industrial?.powerRatio ?? 1);
    expect(districts.some((district) => district.powerRatio < 0.5)).toBe(true);
  });

  it('maps configured plot coordinates into the same 3/4 world coordinate system', () => {
    expect(toScenePoint(plots[0] as CityPlotConfig)).toEqual({
      x: -30.6,
      z: -17.16,
      elevation: 0
    });
  });

  it('keeps visual hashes stable for replayable traffic and window lights', () => {
    expect(stableVisualHash('city-test:block:1')).toBe(stableVisualHash('city-test:block:1'));
    expect(stableVisualHash('city-test:block:1')).not.toBe(stableVisualHash('city-test:block:2'));
  });
});
