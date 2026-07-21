import { BuildingBase } from '../buildings/BuildingBase';

export interface SpecialLogicContext {
  hour: number;
  eventOutputMultiplier: number;
}

export class SpecialLogicSystem {
  static getOutputMultiplier(building: BuildingBase, context: SpecialLogicContext): number {
    const logic = building.config.specialLogic;

    if (logic === 'solar_daylight') {
      const daylight = Math.max(0, Math.sin(((context.hour - 6) / 12) * Math.PI));
      return daylight * context.eventOutputMultiplier;
    }

    if (logic === 'wind_weather') {
      const windCycle = 0.82 + 0.18 * Math.sin((context.hour / 24) * Math.PI * 2 + 0.8);
      return Math.max(0.55, windCycle) * context.eventOutputMultiplier;
    }

    return context.eventOutputMultiplier;
  }
}