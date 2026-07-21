import type { GameState } from '../core/GameState';
import type { ScenarioConditionGroup } from '../systems/ScenarioConditionSystem';
import type { SimulationModifiers } from '../systems/SimulationModifiers';

export type RuleMutableField =
  | 'money'
  | 'population'
  | 'satisfaction'
  | 'pollution'
  | 'researchPoints';

export interface RuleConfigBase {
  id: string;
  version: 1;
  enabled?: boolean;
}

export interface DemandGrowthRuleConfig extends RuleConfigBase {
  type: 'demandGrowth';
  ratePerDay: number;
  maxMultiplier: number;
}

export interface TimeWindowModifierRuleConfig extends RuleConfigBase {
  type: 'timeWindowModifier';
  startHour: number;
  endHour: number;
  modifiers: Partial<SimulationModifiers>;
}

export interface ConditionalModifierRuleConfig extends RuleConfigBase {
  type: 'conditionalModifier';
  when: ScenarioConditionGroup;
  modifiers: Partial<SimulationModifiers>;
}

export interface ConditionalActionRuleConfig extends RuleConfigBase {
  type: 'conditionalAction';
  when: ScenarioConditionGroup;
  action: {
    type: 'adjustState';
    field: RuleMutableField;
    amountPerHour: number;
  };
}

export interface BehaviorRuleConfig extends RuleConfigBase {
  type: 'behavior';
  behavior: string;
  params?: Record<string, number | string | boolean>;
}

export type RuleComponentConfig =
  | DemandGrowthRuleConfig
  | TimeWindowModifierRuleConfig
  | ConditionalModifierRuleConfig
  | ConditionalActionRuleConfig
  | BehaviorRuleConfig;

export interface RuleContext {
  state: Readonly<GameState>;
  deltaHours: number;
}

export interface RuleSignal {
  ruleId: string;
  signal: string;
}

export interface RuleEvaluation {
  modifiers?: Partial<SimulationModifiers>;
  stateDeltas?: Partial<Record<RuleMutableField, number>>;
  signals?: RuleSignal[];
}

export interface RuleHandler<TConfig extends RuleComponentConfig = RuleComponentConfig> {
  readonly type: TConfig['type'];
  evaluate(config: TConfig, context: RuleContext): RuleEvaluation;
}
