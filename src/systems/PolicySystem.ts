import type { GameState } from '../core/GameState';
import {
  neutralSimulationModifiers,
  type SimulationModifierEffects,
  type SimulationModifiers
} from './SimulationModifiers';

export interface PolicyConfig {
  id: string;
  name: string;
  description: string;
  assetId: string;
  activationCost: number;
  effects: SimulationModifierEffects;
}

export interface PolicyCheck {
  ok: boolean;
  reason?: string;
}

export class PolicySystem {
  static canActivate(state: GameState, policy: PolicyConfig): PolicyCheck {
    if (state.activePolicyId === policy.id) return { ok: false, reason: '该政策正在执行' };
    if (state.money < policy.activationCost) return { ok: false, reason: '政策预算不足' };
    return { ok: true };
  }

  static getModifiers(
    activePolicyId: string | undefined,
    catalog: readonly PolicyConfig[]
  ): SimulationModifiers {
    if (!activePolicyId) return neutralSimulationModifiers();
    const policy = catalog.find((item) => item.id === activePolicyId);
    return {
      ...neutralSimulationModifiers(),
      ...(policy?.effects ?? {})
    };
  }
}
