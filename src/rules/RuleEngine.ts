import type { GameState } from '../core/GameState';
import {
  mergeSimulationModifiers,
  neutralSimulationModifiers,
  type SimulationModifiers
} from '../systems/SimulationModifiers';
import { createDefaultRuleRegistry, type RuleRegistry } from './RuleRegistry';
import type {
  RuleComponentConfig,
  RuleContext,
  RuleEvaluation,
  RuleMutableField,
  RuleSignal
} from './RuleTypes';

export interface RuleEngineResult {
  modifiers: SimulationModifiers;
  stateDeltas: Partial<Record<RuleMutableField, number>>;
  signals: RuleSignal[];
}

const addDelta = (
  target: Partial<Record<RuleMutableField, number>>,
  source: Partial<Record<RuleMutableField, number>> | undefined
): void => {
  if (!source) return;
  for (const [field, value] of Object.entries(source) as Array<[RuleMutableField, number | undefined]>) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      target[field] = (target[field] ?? 0) + value;
    }
  }
};

export class RuleEngine {
  constructor(
    private readonly configs: readonly RuleComponentConfig[],
    private readonly registry: RuleRegistry = createDefaultRuleRegistry()
  ) {}

  evaluate(context: RuleContext): RuleEngineResult {
    const evaluations: RuleEvaluation[] = this.configs.map((config) => this.registry.evaluate(config, context));
    const stateDeltas: Partial<Record<RuleMutableField, number>> = {};
    const signals: RuleSignal[] = [];

    for (const evaluation of evaluations) {
      addDelta(stateDeltas, evaluation.stateDeltas);
      if (evaluation.signals) signals.push(...evaluation.signals);
    }

    return {
      modifiers: mergeSimulationModifiers(
        neutralSimulationModifiers(),
        ...evaluations.map((evaluation) => evaluation.modifiers)
      ),
      stateDeltas,
      signals
    };
  }

  applyStateDeltas(state: GameState, deltas: RuleEngineResult['stateDeltas']): void {
    state.money += deltas.money ?? 0;
    state.population = Math.max(0, state.population + (deltas.population ?? 0));
    state.satisfaction = Math.min(100, Math.max(0, state.satisfaction + (deltas.satisfaction ?? 0)));
    state.pollution = Math.min(100, Math.max(0, state.pollution + (deltas.pollution ?? 0)));
    state.researchPoints = Math.max(0, state.researchPoints + (deltas.researchPoints ?? 0));
  }

  getRuleTypes(): string[] {
    return this.registry.ruleTypes();
  }

  getBehaviorIds(): string[] {
    return this.registry.behaviorIds();
  }
}
