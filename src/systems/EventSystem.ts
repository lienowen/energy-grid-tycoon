import type { RandomSource } from '../core/DeterministicRandom';
import type { ActiveEventSnapshot } from '../core/SaveSchema';

export interface EventEffects {
  demandMultiplier: number;
  outputMultiplier: number;
  priceMultiplier: number;
  maintenanceMultiplier?: number;
  satisfactionDelta: number;
}

export interface EventConfig {
  id: string;
  name: string;
  description: string;
  durationHours: number;
  weight: number;
  effects: EventEffects;
}

export interface ActiveEvent {
  config: EventConfig;
  remainingHours: number;
}

const neutralEffects: EventEffects = {
  demandMultiplier: 1,
  outputMultiplier: 1,
  priceMultiplier: 1,
  maintenanceMultiplier: 1,
  satisfactionDelta: 0
};

export class EventSystem {
  private active?: ActiveEvent;

  constructor(private readonly random: RandomSource) {}

  getActive(): ActiveEvent | undefined {
    return this.active;
  }

  getEffects(): EventEffects {
    return this.active?.config.effects ?? neutralEffects;
  }

  getSnapshot(): ActiveEventSnapshot | undefined {
    if (!this.active) return undefined;
    return {
      eventId: this.active.config.id,
      remainingHours: this.active.remainingHours
    };
  }

  restore(snapshot: ActiveEventSnapshot | undefined, catalog: EventConfig[]): void {
    if (!snapshot) {
      this.active = undefined;
      return;
    }

    const config = catalog.find((event) => event.id === snapshot.eventId);
    this.active = config
      ? { config, remainingHours: Math.max(0, snapshot.remainingHours) }
      : undefined;
  }

  advance(hours: number): void {
    if (!this.active) return;
    this.active.remainingHours -= hours;
    if (this.active.remainingHours <= 0) this.active = undefined;
  }

  maybeTrigger(poolIds: string[], catalog: EventConfig[], chance = 0.08): ActiveEvent | undefined {
    if (this.active || this.random.next() > chance) return this.active;

    const pool = catalog.filter((event) => poolIds.includes(event.id));
    const totalWeight = pool.reduce((sum, event) => sum + event.weight, 0);
    if (totalWeight <= 0) return undefined;

    let roll = this.random.next() * totalWeight;
    for (const event of pool) {
      roll -= event.weight;
      if (roll <= 0) {
        this.active = { config: event, remainingHours: event.durationHours };
        return this.active;
      }
    }

    return undefined;
  }
}
