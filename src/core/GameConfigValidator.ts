import type { BuildingConfig } from '../buildings/BuildingBase';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';

export interface GameCatalogs {
  levels: readonly LevelConfig[];
  buildings: readonly BuildingConfig[];
  events: readonly EventConfig[];
  technologies: readonly TechnologyConfig[];
  policies: readonly PolicyConfig[];
}

const duplicateIds = (items: readonly { id: string }[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return [...duplicates];
};

export class GameConfigValidator {
  static assertValid(catalogs: GameCatalogs): void {
    const errors: string[] = [];
    const buildingIds = new Set(catalogs.buildings.map((item) => item.id));
    const eventIds = new Set(catalogs.events.map((item) => item.id));
    const technologyIds = new Set(catalogs.technologies.map((item) => item.id));
    const policyIds = new Set(catalogs.policies.map((item) => item.id));
    const levelIds = new Set(catalogs.levels.map((item) => item.id));

    for (const [label, items] of [
      ['level', catalogs.levels],
      ['building', catalogs.buildings],
      ['event', catalogs.events],
      ['technology', catalogs.technologies],
      ['policy', catalogs.policies]
    ] as const) {
      for (const id of duplicateIds(items)) errors.push(`Duplicate ${label} id: ${id}`);
    }

    for (const level of catalogs.levels) {
      const prefix = `Level ${level.id}`;
      if (level.rules.objective.conditions.length === 0) errors.push(`${prefix} has no objective conditions`);
      if (level.rules.failure.conditions.length === 0) errors.push(`${prefix} has no failure conditions`);
      if (level.rules.powerPriceRange.min > level.rules.powerPriceRange.max) {
        errors.push(`${prefix} has an invalid power price range`);
      }
      if (level.rules.eventTriggerChance < 0 || level.rules.eventTriggerChance > 1) {
        errors.push(`${prefix} eventTriggerChance must be between 0 and 1`);
      }
      if (level.rules.tickIntervalMs < 100) errors.push(`${prefix} tickIntervalMs is too small`);

      const references: Array<[string, readonly string[], ReadonlySet<string>]> = [
        ['building', level.catalog.buildings, buildingIds],
        ['starting building', level.initial.buildings, buildingIds],
        ['event', level.catalog.events, eventIds],
        ['technology', level.catalog.technologies, technologyIds],
        ['starting technology', level.initial.technologies, technologyIds],
        ['policy', level.catalog.policies, policyIds],
        ['progression prerequisite', level.progression.requiresCompletedLevelIds, levelIds]
      ];

      for (const [type, ids, catalog] of references) {
        for (const id of ids) {
          if (!catalog.has(id)) errors.push(`${prefix} references unknown ${type}: ${id}`);
        }
      }

      if (level.progression.nextLevelId && !levelIds.has(level.progression.nextLevelId)) {
        errors.push(`${prefix} references unknown next level: ${level.progression.nextLevelId}`);
      }
      for (const id of level.initial.buildings) {
        if (!level.catalog.buildings.includes(id)) errors.push(`${prefix} starts with unavailable building: ${id}`);
      }
      for (const id of level.initial.technologies) {
        if (!level.catalog.technologies.includes(id)) errors.push(`${prefix} starts with unavailable technology: ${id}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid game configuration:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    }
  }
}
