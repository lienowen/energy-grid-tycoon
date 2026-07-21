import type { BuildingConfig } from '../buildings/BuildingBase';
import type { GameState } from '../core/GameState';
import type { PolicyConfig } from '../systems/PolicySystem';
import type { TechnologyConfig } from '../systems/ResearchSystem';
import { mergeSimulationModifiers } from '../systems/SimulationModifiers';

export const validateOperationsContracts = (
  state: GameState,
  building: BuildingConfig,
  technology: TechnologyConfig,
  policy: PolicyConfig
): boolean => {
  const modifiers = mergeSimulationModifiers(technology.effects, policy.effects);
  return Boolean(
    state.levelId
      && building.id
      && modifiers.generationMultiplier > 0
      && modifiers.maintenanceMultiplier > 0
  );
};
