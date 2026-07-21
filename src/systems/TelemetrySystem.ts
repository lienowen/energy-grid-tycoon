import type { GameState } from '../core/GameState';
import type { TelemetrySnapshot } from '../core/SaveSchema';
import type { EconomyResult } from './EconomySystem';
import type { PowerResult } from './PowerSystem';

export type TelemetryPoint = TelemetrySnapshot;

export class TelemetrySystem {
  private readonly points: TelemetryPoint[];

  constructor(
    initial: readonly TelemetryPoint[] = [],
    private readonly maxPoints = 48
  ) {
    this.points = initial.slice(-maxPoints).map((point) => ({ ...point }));
  }

  record(state: GameState, economy: EconomyResult, power: PowerResult): void {
    this.points.push({
      day: state.day,
      hour: state.hour,
      money: state.money,
      demand: state.powerDemand,
      supply: state.powerSupply,
      satisfaction: state.satisfaction,
      pollution: state.pollution,
      storageEnergy: state.storageEnergy,
      researchPoints: state.researchPoints,
      profit: economy.profit,
      shortage: power.shortage
    });

    if (this.points.length > this.maxPoints) {
      this.points.splice(0, this.points.length - this.maxPoints);
    }
  }

  getPoints(): readonly TelemetryPoint[] {
    return this.points;
  }

  toSnapshot(): TelemetryPoint[] {
    return this.points.map((point) => ({ ...point }));
  }
}
