import { BehaviorRegistry, type BehaviorHandler, type BehaviorParams } from './BehaviorRegistry';

const numberParam = (params: BehaviorParams, key: string, fallback: number): number => {
  const value = params[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const rollingBlackout: BehaviorHandler = {
  id: 'rolling_blackout',
  evaluate(params, context) {
    const threshold = numberParam(params, 'threshold', 0.92);
    if (context.state.supplyRatio >= threshold) return {};

    return {
      modifiers: {
        demandMultiplier: numberParam(params, 'demandReliefMultiplier', 0.96),
        satisfactionDeltaPerHour: numberParam(params, 'satisfactionPenaltyPerHour', -0.22)
      },
      signals: [{ ruleId: 'behavior:rolling_blackout', signal: 'rolling_blackout.active' }]
    };
  }
};

const cleanEnergyMomentum: BehaviorHandler = {
  id: 'clean_energy_momentum',
  evaluate(params, context) {
    const maxPollution = numberParam(params, 'maxPollution', 30);
    const minSupplyRatio = numberParam(params, 'minSupplyRatio', 0.98);
    if (context.state.pollution > maxPollution || context.state.supplyRatio < minSupplyRatio) return {};

    return {
      modifiers: {
        researchMultiplier: numberParam(params, 'researchMultiplier', 1.1),
        satisfactionDeltaPerHour: numberParam(params, 'satisfactionBonusPerHour', 0.04)
      },
      signals: [{ ruleId: 'behavior:clean_energy_momentum', signal: 'clean_energy_momentum.active' }]
    };
  }
};

export const createBuiltinBehaviorRegistry = (): BehaviorRegistry => new BehaviorRegistry()
  .register(rollingBlackout)
  .register(cleanEnergyMomentum);
