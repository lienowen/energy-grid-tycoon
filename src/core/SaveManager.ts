import type { GameState } from './GameState';
import type { ActiveEventSnapshot, BuildingSnapshot } from './SaveSchema';

const SAVE_KEY = 'energy-grid-tycoon:save:v1';
const PROFILE_KEY = 'energy-grid-tycoon:profile:v1';

export interface GameSave {
  version: 1;
  savedAt: string;
  levelId: string;
  state: GameState;
  buildings: BuildingSnapshot[];
  activeEvent?: ActiveEventSnapshot;
}

export interface PlayerProfile {
  version: 1;
  completedLevelIds: string[];
}

const defaultProfile = (): PlayerProfile => ({ version: 1, completedLevelIds: [] });

export class SaveManager {
  static saveGame(save: GameSave): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  }

  static loadGame(): GameSave | undefined {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Partial<GameSave>;
      if (parsed.version !== 1 || !parsed.levelId || !parsed.state || !Array.isArray(parsed.buildings)) {
        return undefined;
      }
      return parsed as GameSave;
    } catch {
      return undefined;
    }
  }

  static clearGame(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  }

  static loadProfile(): PlayerProfile {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      if (parsed.version !== 1 || !Array.isArray(parsed.completedLevelIds)) return defaultProfile();
      return { version: 1, completedLevelIds: [...new Set(parsed.completedLevelIds)] };
    } catch {
      return defaultProfile();
    }
  }

  static markCompleted(levelId: string): PlayerProfile {
    const profile = this.loadProfile();
    if (!profile.completedLevelIds.includes(levelId)) profile.completedLevelIds.push(levelId);

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // The in-memory result is still useful even when persistence is blocked.
    }

    return profile;
  }
}
