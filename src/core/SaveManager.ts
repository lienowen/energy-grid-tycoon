import type { GameState } from './GameState';
import type {
  ActiveEventSnapshot,
  BuildingSnapshot,
  TelemetrySnapshot
} from './SaveSchema';

const SAVE_KEY = 'energy-grid-tycoon:save:v1';
const PROFILE_KEY = 'energy-grid-tycoon:profile:v1';

export interface GameSave {
  version: 2;
  savedAt: string;
  levelId: string;
  state: GameState;
  buildings: BuildingSnapshot[];
  activeEvent?: ActiveEventSnapshot;
  telemetry: TelemetrySnapshot[];
}

export interface PlayerProfile {
  version: 2;
  completedLevelIds: string[];
  bestScoreByLevel: Record<string, number>;
}

const defaultProfile = (): PlayerProfile => ({
  version: 2,
  completedLevelIds: [],
  bestScoreByLevel: {}
});

const migrateBuildingSnapshot = (item: Partial<BuildingSnapshot>): BuildingSnapshot => {
  const snapshot: BuildingSnapshot = {
    instanceId: String(item.instanceId),
    configId: String(item.configId),
    enabled: item.enabled !== false,
    storedEnergy: Math.max(0, Number(item.storedEnergy ?? 0)),
    level: Math.max(1, Math.floor(Number(item.level ?? 1)))
  };
  if (typeof item.placementId === 'string' && item.placementId) {
    snapshot.placementId = item.placementId;
  }
  return snapshot;
};

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
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed.levelId || !parsed.state || !Array.isArray(parsed.buildings)) return undefined;

      const stateInput = parsed.state as Partial<GameState>;
      const migratedRandomState = Math.floor(Number(stateInput.randomState ?? 1)) >>> 0;
      const state = {
        ...stateInput,
        randomState: migratedRandomState || 1,
        researchPoints: Math.max(0, stateInput.researchPoints ?? 0),
        unlockedTechnologyIds: Array.isArray(stateInput.unlockedTechnologyIds)
          ? [...new Set(stateInput.unlockedTechnologyIds)]
          : [],
        totalRevenue: Math.max(0, stateInput.totalRevenue ?? 0),
        totalEnergyServed: Math.max(0, stateInput.totalEnergyServed ?? 0),
        totalShortage: Math.max(0, stateInput.totalShortage ?? 0)
      } as GameState;
      const buildings = (parsed.buildings as Array<Partial<BuildingSnapshot>>)
        .filter((item) => Boolean(item.instanceId && item.configId))
        .map(migrateBuildingSnapshot);

      return {
        version: 2,
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
        levelId: String(parsed.levelId),
        state,
        buildings,
        activeEvent: parsed.activeEvent as ActiveEventSnapshot | undefined,
        telemetry: Array.isArray(parsed.telemetry)
          ? (parsed.telemetry as TelemetrySnapshot[]).slice(-48)
          : []
      };
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
      const parsed = JSON.parse(raw) as Partial<PlayerProfile> & { version?: number };
      if (!Array.isArray(parsed.completedLevelIds)) return defaultProfile();
      return {
        version: 2,
        completedLevelIds: [...new Set(parsed.completedLevelIds)],
        bestScoreByLevel: parsed.bestScoreByLevel && typeof parsed.bestScoreByLevel === 'object'
          ? { ...parsed.bestScoreByLevel }
          : {}
      };
    } catch {
      return defaultProfile();
    }
  }

  static markCompleted(levelId: string, score = 0): PlayerProfile {
    const profile = this.loadProfile();
    if (!profile.completedLevelIds.includes(levelId)) profile.completedLevelIds.push(levelId);
    profile.bestScoreByLevel[levelId] = Math.max(profile.bestScoreByLevel[levelId] ?? 0, score);

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // The in-memory result is still useful even when persistence is blocked.
    }

    return profile;
  }
}
