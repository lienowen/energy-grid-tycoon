import { PowerSystem } from './PowerSystem';
import { EconomySystem } from './EconomySystem';
import { GameState } from '../core/GameState';

export class SimulationSystem {
  static tick(state: GameState) {
    const power = PowerSystem.calculate(state);
    const economy = EconomySystem.calculate(state, power);

    return {
      power,
      economy
    };
  }
}
