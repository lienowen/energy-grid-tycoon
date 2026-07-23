import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from './GameState';
import { SaveManager, type GameSave } from './SaveManager';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
}

const makeSave = (levelId: string, money: number): GameSave => ({
  version: 2,
  savedAt: '2026-07-23T00:00:00.000Z',
  levelId,
  state: {
    ...createInitialState({
      levelId,
      cityName: `City ${levelId}`,
      money,
      population: 1200,
      baseDemand: 320,
      powerPrice: 0.82,
      randomSeed: 42
    }),
    money
  },
  buildings: [],
  telemetry: []
});

describe('SaveManager', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    SaveManager.consumeRecoveryNotice();
  });

  it('stores and verifies the latest city save', () => {
    expect(SaveManager.saveGame(makeSave('coastal-city', 4400))).toBe(true);
    const loaded = SaveManager.loadGame();
    expect(loaded?.levelId).toBe('coastal-city');
    expect(loaded?.state.money).toBe(4400);
  });

  it('restores the previous verified backup when the primary save is corrupt', () => {
    SaveManager.saveGame(makeSave('starter-city', 3100));
    SaveManager.saveGame(makeSave('starter-city', 5200));
    storage.setItem('energy-grid-tycoon:save:v1', '{broken-json');

    const recovered = SaveManager.loadGame();
    expect(recovered?.state.money).toBe(3100);
    expect(SaveManager.consumeRecoveryNotice()).toBe(true);
    expect(SaveManager.consumeRecoveryNotice()).toBe(false);
  });

  it('continues to load legacy unwrapped saves', () => {
    storage.setItem('energy-grid-tycoon:save:v1', JSON.stringify(makeSave('legacy-city', 2700)));
    const loaded = SaveManager.loadGame();
    expect(loaded?.levelId).toBe('legacy-city');
    expect(loaded?.state.randomState).toBe(42);
  });

  it('clears both primary and backup saves', () => {
    SaveManager.saveGame(makeSave('starter-city', 3100));
    SaveManager.saveGame(makeSave('starter-city', 5200));
    SaveManager.clearGame();
    expect(storage.getItem('energy-grid-tycoon:save:v1')).toBeNull();
    expect(storage.getItem('energy-grid-tycoon:save-backup:v1')).toBeNull();
  });
});
