import { describe, expect, it } from 'vitest';
import buildingData from '../data/buildings.json';
import eventData from '../data/events.json';
import levelData from '../data/levels.json';
import policyData from '../data/policies.json';
import technologyData from '../data/technologies.json';
import type { BuildingConfig } from '../buildings/BuildingBase';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { LevelAssetPlanner } from './LevelAssetPlanner';

describe('LevelAssetPlanner', () => {
  it('derives a complete unique bundle from level configuration', () => {
    const level = (levelData as unknown as LevelConfig[])[1]!;
    const ids = LevelAssetPlanner.resolve(level, {
      buildings: buildingData as unknown as BuildingConfig[],
      events: eventData as unknown as EventConfig[],
      technologies: technologyData as unknown as TechnologyConfig[],
      policies: policyData as unknown as PolicyConfig[]
    });

    expect(ids).toContain(level.presentation?.backgroundAssetId);
    expect(ids).toContain('building_solar');
    expect(ids).toContain('event_industrial_surge');
    expect(ids).toContain('tech_offshore');
    expect(ids).toContain('policy_industry');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
