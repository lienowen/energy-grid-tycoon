import { createBuiltinBehaviorRegistry } from '../gameplay/behaviors/BuiltinBehaviors';
import type { BehaviorRegistry } from '../gameplay/behaviors/BehaviorRegistry';
import { ScenarioConditionSystem } from '../systems/ScenarioConditionSystem';
import type {
  BehaviorRuleConfig,
  ConditionalActionRuleConfig,
  ConditionalModifierRuleConfig,
  DemandGrowthRuleConfig,
  RuleComponentConfig,
  RuleContext,
  RuleEvaluation,
  RuleHandler,
  TimeWindowModifierRuleConfig
} from './RuleTypes';

interface StoredRuleHandler {
  readonly type: RuleComponentConfig['type'];
  evaluate(config: RuleComponentConfig, context: RuleContext): RuleEvaluation;
}

const isHourInWindow = (hour: number, startHour: number, endHour: number): boolean => {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const start = ((startHour % 24) + 24) % 24;
  const end = ((endHour % 24) + 24) % 24;
  if (start === end) return true;
  return start < end
    ? normalizedHour >= start && normalizedHour < end
    : normalizedHour >= start || normalizedHour < end;
};

const demandGrowthHandler: RuleHandler<DemandGrowthRuleConfig> = {
  type: 'demandGrowth',
  evaluate(config, context) {
    const elapsedDays = Math.max(0, context.state.day - 1 + context.state.hour / 24);
    const cap = Math.max(1, config.maxMultiplier);
    const multiplier = Math.min(cap, 1 + Math.max(0, config.ratePerDay) * elapsedDays);
    return { modifiers: { demandMultiplier: multiplier } };
  }
};

const timeWindowModifierHandler: RuleHandler<TimeWindowModifierRuleConfig> = {
  type: 'timeWindowModifier',
  evaluate(config, context) {
    return isHourInWindow(context.state.hour, config.startHour, config.endHour)
      ? { modifiers: config.modifiers }
      : {};
  }
};

const conditionalModifierHandler: RuleHandler<ConditionalModifierRuleConfig> = {
  type: 'conditionalModifier',
  evaluate(config, context) {
    return ScenarioConditionSystem.evaluateGroup(context.state, config.when)
      ? { modifiers: config.modifiers }
      : {};
  }
};

const conditionalActionHandler: RuleHandler<ConditionalActionRuleConfig> = {
  type: 'conditionalAction',
  evaluate(config, context) {
    if (!ScenarioConditionSystem.evaluateGroup(context.state, config.when)) return {};
    return {
      stateDeltas: {
        [config.action.field]: config.action.amountPerHour * Math.max(0, context.deltaHours)
      },
      signals: [{ ruleId: config.id, signal: `action.${config.action.field}` }]
    };
  }
};

export class RuleRegistry {
  private readonly handlers = new Map<RuleComponentConfig['type'], StoredRuleHandler>();

  constructor(private readonly behaviors: BehaviorRegistry) {}

  register<TConfig extends RuleComponentConfig>(handler: RuleHandler<TConfig>): this {
    if (this.handlers.has(handler.type)) throw new Error(`Rule handler already registered: ${handler.type}`);
    this.handlers.set(handler.type, {
      type: handler.type,
      evaluate: (config, context) => handler.evaluate(config as TConfig, context)
    });
    return this;
  }

  registerBehaviorRule(): this {
    const behaviorHandler: RuleHandler<BehaviorRuleConfig> = {
      type: 'behavior',
      evaluate: (config, context) => {
        const evaluation = this.behaviors.evaluate(config.behavior, config.params ?? {}, context);
        return {
          ...evaluation,
          signals: evaluation.signals?.map((signal) => ({ ...signal, ruleId: config.id }))
        };
      }
    };
    return this.register(behaviorHandler);
  }

  evaluate(config: RuleComponentConfig, context: RuleContext): RuleEvaluation {
    const handler = this.handlers.get(config.type);
    if (!handler) throw new Error(`Unknown rule type: ${config.type}`);
    return config.enabled === false ? {} : handler.evaluate(config, context);
  }

  ruleTypes(): string[] {
    return [...this.handlers.keys()];
  }

  behaviorIds(): string[] {
    return this.behaviors.ids();
  }
}

export const createDefaultRuleRegistry = (): RuleRegistry => new RuleRegistry(createBuiltinBehaviorRegistry())
  .register(demandGrowthHandler)
  .register(timeWindowModifierHandler)
  .register(conditionalModifierHandler)
  .register(conditionalActionHandler)
  .registerBehaviorRule();
