import type { GameState } from '../core/GameState';
import {
  mergeSimulationModifiers,
  neutralSimulationModifiers,
  type SimulationModifiers
} from './SimulationModifiers';

export interface TechnologyConfig {
  id: string;
  name: string;
  description: string;
  assetId: string;
  cost: number;
  prerequisites: string[];
  unlockBuildings?: string[];
  effects: Partial<SimulationModifiers>;
}

export interface ResearchCheck {
  ok: boolean;
  reason?: string;
}

export class ResearchSystem {
  static canUnlock(state: GameState, technology: TechnologyConfig): ResearchCheck {
    if (state.unlockedTechnologyIds.includes(technology.id)) {
      return { ok: false, reason: '该技术已经完成' };
    }

    const missing = technology.prerequisites.filter(
      (technologyId) => !state.unlockedTechnologyIds.includes(technologyId)
    );
    if (missing.length > 0) return { ok: false, reason: '前置技术尚未完成' };
    if (state.researchPoints < technology.cost) return { ok: false, reason: '研发点不足' };
    return { ok: true };
  }

  static getModifiers(
    unlockedTechnologyIds: readonly string[],
    catalog: readonly TechnologyConfig[]
  ): SimulationModifiers {
    const unlocked = new Set(unlockedTechnologyIds);
    const effects = catalog
      .filter((technology) => unlocked.has(technology.id))
      .map((technology) => technology.effects);
    return mergeSimulationModifiers(neutralSimulationModifiers(), ...effects);
  }

  static calculateResearchGain(
    state: GameState,
    tickHours: number,
    modifiers: SimulationModifiers
  ): number {
    const reliability = Math.min(1.1, Math.max(0.15, state.supplyRatio));
    const cityScale = 0.9 + Math.min(2.4, state.population / 9000);
    const stabilityBonus = state.supplyRatio >= 0.98 ? 1.2 : 0.72;
    return Math.max(
      0,
      cityScale * reliability * stabilityBonus * Math.max(0, tickHours) * modifiers.researchMultiplier
    );
  }
}
