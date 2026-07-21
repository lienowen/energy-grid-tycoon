import { describe, expect, it } from 'vitest';
import buildingData from '../data/buildings.json';
import eventData from '../data/events.json';
import levelData from '../data/levels.json';
import policyData from '../data/policies.json';
import technologyData from '../data/technologies.json';
import assetCatalogData from '../resources/asset-catalog.json';
import type { BuildingConfig } from '../buildings/BuildingBase';
import type { AssetCatalog } from '../resources/AssetManager';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { GameConfigValidator } from './GameConfigValidator';

const createCatalogs = () => {
  const assets = assetCatalogData as unknown as AssetCatalog;
  return {
    levels: structuredClone(levelData) as unknown as LevelConfig[],
    buildings: structuredClone(buildingData) as unknown as BuildingConfig[],
    events: structuredClone(eventData) as unknown as EventConfig[],
    technologies: structuredClone(technologyData) as unknown as TechnologyConfig[],
    policies: structuredClone(policyData) as unknown as PolicyConfig[],
    assetIds: new Set(assets.entries.map((entry) => entry.id))
  };
};

describe('GameConfigValidator', () => {
  it('accepts the production catalogs', () => {
    expect(() => GameConfigValidator.assertValid(createCatalogs())).not.toThrow();
  });

  it('rejects broken cross-catalog references', () => {
    const catalogs = createCatalogs();
    catalogs.levels[0]!.catalog.buildings.push('missing_generator');

    expect(() => GameConfigValidator.assertValid(catalogs))
      .toThrow(/unknown building: missing_generator/);
  });

  it('rejects unknown registered behaviors', () => {
    const catalogs = createCatalogs();
    catalogs.levels[0]!.rules.components.push({
      id: 'invalid-behavior',
      version: 1,
      type: 'behavior',
      behavior: 'not_registered'
    });

    expect(() => GameConfigValidator.assertValid(catalogs))
      .toThrow(/unknown behavior: not_registered/);
  });

  it('rejects missing presentation assets', () => {
    const catalogs = createCatalogs();
    catalogs.levels[0]!.presentation = {
      ...catalogs.levels[0]!.presentation,
      backgroundAssetId: 'background_missing'
    };

    expect(() => GameConfigValidator.assertValid(catalogs))
      .toThrow(/unknown background asset: background_missing/);
  });
});
