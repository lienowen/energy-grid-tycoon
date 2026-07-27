import type { GameSpeed } from './GameState';

export const GAME_MINUTES_PER_REAL_SECOND_AT_1X = 5;

export class SimulationClock {
  static toDeltaHours(speed: GameSpeed, tickIntervalMs: number): number {
    if (speed <= 0 || tickIntervalMs <= 0) return 0;
    const realSeconds = tickIntervalMs / 1000;
    return speed * realSeconds * GAME_MINUTES_PER_REAL_SECOND_AT_1X / 60;
  }
}
