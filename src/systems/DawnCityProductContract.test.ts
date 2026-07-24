import { describe, expect, it } from 'vitest';
import levelData from '../data/levels.json';
import type { LevelConfig } from './LevelLoader';

const levels = levelData as unknown as LevelConfig[];
const dawnCity = levels.find((level) => level.id === 'city-01');

describe('曙光新城产品契约', () => {
  it('将通关条件绑定到复电、储能、升级和经营成果', () => {
    expect(dawnCity).toBeDefined();
    const metrics = dawnCity?.rules.objective.conditions.map((condition) => condition.metric);

    expect(metrics).toEqual([
      'supplyRatio',
      'storageCapacity',
      'unlockedTechnologies',
      'totalRevenue'
    ]);
  });

  it('不再把单纯囤积现金作为第一关核心目标', () => {
    const metrics = dawnCity?.rules.objective.conditions.map((condition) => condition.metric) ?? [];

    expect(metrics).not.toContain('money');
    expect(dawnCity?.rules.objective.label).toContain('全城供电');
    expect(dawnCity?.rules.objective.label).toContain('建成储能');
  });
});
