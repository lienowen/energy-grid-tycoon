import { describe, expect, it, vi } from 'vitest';
import { DomainEventBus } from './DomainEventBus';
import type { GameDomainEventMap } from './GameDomainEvents';

describe('DomainEventBus', () => {
  it('dispatches typed events in sequence order', () => {
    const bus = new DomainEventBus<GameDomainEventMap>();
    const buildingListener = vi.fn();
    const anyListener = vi.fn();
    bus.on('building.completed', buildingListener);
    bus.onAny(anyListener);

    const first = bus.emit('building.completed', {
      configId: 'solar_basic',
      instanceId: 'building-1'
    });
    const second = bus.emit('grid.overloaded', {
      supplyRatio: 0.72,
      supply: 720,
      demand: 1000
    });

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(buildingListener).toHaveBeenCalledTimes(1);
    expect(anyListener).toHaveBeenCalledTimes(2);
  });

  it('supports unsubscribe and clear', () => {
    const bus = new DomainEventBus<GameDomainEventMap>();
    const listener = vi.fn();
    const unsubscribe = bus.on('scenario.completed', listener);

    unsubscribe();
    bus.emit('scenario.completed', { levelId: 'city-01', score: 1200 });
    expect(listener).not.toHaveBeenCalled();

    bus.on('scenario.completed', listener);
    bus.clear();
    bus.emit('scenario.completed', { levelId: 'city-02', score: 1600 });
    expect(listener).not.toHaveBeenCalled();
  });
});
