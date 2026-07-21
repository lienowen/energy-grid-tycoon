import type { BuildingConfig } from '../buildings/BuildingBase';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';

export interface LevelAssetCatalogs {
  buildings: readonly BuildingConfig[];
  events: readonly EventConfig[];
  technologies: readonly TechnologyConfig[];
  policies: readonly PolicyConfig[];
}

const selectAssetIds = <T extends { id: string; assetId: string }>(
  allowedIds: readonly string[],
  items: readonly T[]
): string[] => {
  const allowed = new Set(allowedIds);
  return items.filter((item) => allowed.has(item.id)).map((item) => item.assetId);
};

export class LevelAssetPlanner {
  static resolve(level: LevelConfig, catalogs: LevelAssetCatalogs): string[] {
    const ids = new Set<string>();
    if (level.presentation?.backgroundAssetId) ids.add(level.presentation.backgroundAssetId);

    for (const id of selectAssetIds(level.catalog.buildings, catalogs.buildings)) ids.add(id);
    for (const id of selectAssetIds(level.catalog.technologies, catalogs.technologies)) ids.add(id);
    for (const id of selectAssetIds(level.catalog.policies, catalogs.policies)) ids.add(id);

    const eventIds = new Set(level.catalog.events);
    for (const event of catalogs.events) {
      if (eventIds.has(event.id)) ids.add(`event_${event.id}`);
    }

    return [...ids];
  }
}
