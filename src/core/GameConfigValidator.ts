import type { BuildingConfig } from '../buildings/BuildingBase';
import { createDefaultRuleRegistry } from '../rules/RuleRegistry';
import type { RuleComponentConfig, RuleMutableField } from '../rules/RuleTypes';
import type { EventConfig } from '../systems/EventSystem';
import type { LevelConfig } from '../systems/LevelLoader';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { ScenarioConditionGroup, ScenarioMetric, ScenarioOperator } from '../systems/ScenarioConditionSystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';

export interface GameCatalogs {
  levels: readonly LevelConfig[];
  buildings: readonly BuildingConfig[];
  events: readonly EventConfig[];
  technologies: readonly TechnologyConfig[];
  policies: readonly PolicyConfig[];
  assetIds: ReadonlySet<string>;
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

const scenarioMetrics = new Set<ScenarioMetric>([
  'money', 'population', 'satisfaction', 'pollution', 'score', 'day', 'hour',
  'supplyRatio', 'researchPoints', 'unlockedTechnologies', 'totalRevenue',
  'totalEnergyServed', 'totalShortage', 'storageEnergy', 'storageCapacity'
]);
const scenarioOperators = new Set<ScenarioOperator>(['gte', 'lte', 'eq']);
const mutableFields = new Set<RuleMutableField>([
  'money', 'population', 'satisfaction', 'pollution', 'researchPoints'
]);

const validateConditionGroup = (prefix: string, group: ScenarioConditionGroup, errors: string[]): void => {
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    errors.push(`${prefix} has no conditions`);
    return;
  }
  if (group.mode !== 'all' && group.mode !== 'any') errors.push(`${prefix} has invalid mode`);
  for (const condition of group.conditions) {
    if (!scenarioMetrics.has(condition.metric)) errors.push(`${prefix} has unknown metric: ${condition.metric}`);
    if (!scenarioOperators.has(condition.operator)) errors.push(`${prefix} has unknown operator: ${condition.operator}`);
    if (!Number.isFinite(condition.target)) errors.push(`${prefix} has non-finite target`);
    if (!condition.label) errors.push(`${prefix} condition is missing a label`);
  }
};

const validateRule = (
  levelId: string,
  rule: RuleComponentConfig,
  ruleTypes: ReadonlySet<string>,
  behaviorIds: ReadonlySet<string>,
  errors: string[]
): void => {
  const prefix = `Level ${levelId} rule ${rule.id}`;
  if (rule.version !== 1) errors.push(`${prefix} has unsupported version`);
  if (!ruleTypes.has(rule.type)) errors.push(`${prefix} has unknown type: ${rule.type}`);

  if (rule.type === 'demandGrowth') {
    if (rule.ratePerDay < 0) errors.push(`${prefix} ratePerDay must be non-negative`);
    if (rule.maxMultiplier < 1) errors.push(`${prefix} maxMultiplier must be at least 1`);
  }
  if (rule.type === 'timeWindowModifier') {
    if (rule.startHour < 0 || rule.startHour > 24 || rule.endHour < 0 || rule.endHour > 24) {
      errors.push(`${prefix} has invalid time window`);
    }
  }
  if (rule.type === 'conditionalModifier' || rule.type === 'conditionalAction') {
    validateConditionGroup(`${prefix} condition`, rule.when, errors);
  }
  if (rule.type === 'conditionalAction' && !mutableFields.has(rule.action.field)) {
    errors.push(`${prefix} adjusts unsupported field: ${rule.action.field}`);
  }
  if (rule.type === 'behavior' && !behaviorIds.has(rule.behavior)) {
    errors.push(`${prefix} references unknown behavior: ${rule.behavior}`);
  }
};

export class GameConfigValidator {
  static assertValid(catalogs: GameCatalogs): void {
    const errors: string[] = [];
    const buildingIds = new Set(catalogs.buildings.map((item) => item.id));
    const eventIds = new Set(catalogs.events.map((item) => item.id));
    const technologyIds = new Set(catalogs.technologies.map((item) => item.id));
    const policyIds = new Set(catalogs.policies.map((item) => item.id));
    const levelIds = new Set(catalogs.levels.map((item) => item.id));
    const registry = createDefaultRuleRegistry();
    const ruleTypes = new Set(registry.ruleTypes());
    const behaviorIds = new Set(registry.behaviorIds());

    for (const [label, items] of [
      ['level', catalogs.levels],
      ['building', catalogs.buildings],
      ['event', catalogs.events],
      ['technology', catalogs.technologies],
      ['policy', catalogs.policies]
    ] as const) {
      for (const id of duplicateIds(items)) errors.push(`Duplicate ${label} id: ${id}`);
    }

    for (const requiredAsset of ['brand_logo', 'status_stable', 'status_warning']) {
      if (!catalogs.assetIds.has(requiredAsset)) errors.push(`Missing required asset: ${requiredAsset}`);
    }

    for (const building of catalogs.buildings) {
      if (!catalogs.assetIds.has(building.assetId)) errors.push(`Building ${building.id} references unknown asset: ${building.assetId}`);
      if (building.requiredTechnologyId && !technologyIds.has(building.requiredTechnologyId)) {
        errors.push(`Building ${building.id} references unknown technology: ${building.requiredTechnologyId}`);
      }
    }
    for (const technology of catalogs.technologies) {
      if (!catalogs.assetIds.has(technology.assetId)) errors.push(`Technology ${technology.id} references unknown asset: ${technology.assetId}`);
      for (const prerequisite of technology.prerequisites) {
        if (!technologyIds.has(prerequisite)) errors.push(`Technology ${technology.id} references unknown prerequisite: ${prerequisite}`);
      }
      for (const buildingId of technology.unlockBuildings ?? []) {
        if (!buildingIds.has(buildingId)) errors.push(`Technology ${technology.id} unlocks unknown building: ${buildingId}`);
      }
    }
    for (const policy of catalogs.policies) {
      if (!catalogs.assetIds.has(policy.assetId)) errors.push(`Policy ${policy.id} references unknown asset: ${policy.assetId}`);
    }
    for (const event of catalogs.events) {
      const assetId = `event_${event.id}`;
      if (!catalogs.assetIds.has(assetId)) errors.push(`Event ${event.id} references missing derived asset: ${assetId}`);
    }

    for (const level of catalogs.levels) {
      const prefix = `Level ${level.id}`;
      if (level.schemaVersion !== 1) errors.push(`${prefix} has unsupported schemaVersion`);
      if (level.rules.schemaVersion !== 1) errors.push(`${prefix} rules have unsupported schemaVersion`);
      if (!Number.isInteger(level.rules.seed) || level.rules.seed <= 0) errors.push(`${prefix} seed must be a positive integer`);
      validateConditionGroup(`${prefix} objective`, level.rules.objective, errors);
      validateConditionGroup(`${prefix} failure`, level.rules.failure, errors);
      if (level.rules.powerPriceRange.min > level.rules.powerPriceRange.max) {
        errors.push(`${prefix} has an invalid power price range`);
      }
      if (level.rules.eventTriggerChance < 0 || level.rules.eventTriggerChance > 1) {
        errors.push(`${prefix} eventTriggerChance must be between 0 and 1`);
      }
      if (level.rules.tickIntervalMs < 100) errors.push(`${prefix} tickIntervalMs is too small`);

      const ruleIds = new Set<string>();
      for (const rule of level.rules.components) {
        if (ruleIds.has(rule.id)) errors.push(`${prefix} has duplicate rule id: ${rule.id}`);
        ruleIds.add(rule.id);
        validateRule(level.id, rule, ruleTypes, behaviorIds, errors);
      }

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
      if (level.presentation?.backgroundAssetId && !catalogs.assetIds.has(level.presentation.backgroundAssetId)) {
        errors.push(`${prefix} references unknown background asset: ${level.presentation.backgroundAssetId}`);
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
