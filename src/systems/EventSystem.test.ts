import { describe, expect, it } from 'vitest';
import { DeterministicRandom } from '../core/DeterministicRandom';
import { EventSystem, type EventConfig } from './EventSystem';

const catalog: EventConfig[] = [
  {
    id: 'heat_wave',
    name: '高温',
    description: '负荷增加',
    durationHours: 2,
    weight: 3,
    effects: {
      demandMultiplier: 1.2,
      outputMultiplier: 1,
      priceMultiplier: 1,
      satisfactionDelta: -0.2
    }
  },
  {
    id: 'fuel_spike',
    name: '燃料涨价',
    description: '成本增加',
    durationHours: 2,
    weight: 1,
    effects: {
      demandMultiplier: 1,
      outputMultiplier: 1,
      priceMultiplier: 1,
      maintenanceMultiplier: 1.3,
      satisfactionDelta: 0
    }
  }
];

const runDeck = (seed: number): string[] => {
  const system = new EventSystem(new DeterministicRandom(seed));
  const sequence: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const active = system.maybeTrigger(catalog.map((event) => event.id), catalog, 1);
    if (active) sequence.push(active.config.id);
    system.advance(3);
  }
  return sequence;
};

describe('EventSystem', () => {
  it('replays the same weighted event sequence for the same seed', () => {
    expect(runDeck(20260721)).toEqual(runDeck(20260721));
  });

  it('restores active event snapshots without consuming random state', () => {
    const random = new DeterministicRandom(77);
    const system = new EventSystem(random);
    system.restore({ eventId: 'heat_wave', remainingHours: 1.5 }, catalog);

    expect(system.getActive()?.config.id).toBe('heat_wave');
    expect(system.getSnapshot()).toEqual({ eventId: 'heat_wave', remainingHours: 1.5 });
    system.advance(2);
    expect(system.getActive()).toBeUndefined();
  });
});
