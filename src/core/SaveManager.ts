import type { GameState } from './GameState';
import type {
  ActiveEventSnapshot,
  BuildingSnapshot,
  TelemetrySnapshot
} from './SaveSchema';

const SAVE_KEY = 'energy-grid-tycoon:save:v1';
const SAVE_BACKUP_KEY = 'energy-grid-tycoon:save-backup:v1';
const PROFILE_KEY = 'energy-grid-tycoon:profile:v1';

interface StorageEnvelope {
  envelopeVersion: 1;
  payload: string;
  checksum: string;
}

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

const checksum = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const encodeEnvelope = (value: unknown): string => {
  const payload = JSON.stringify(value);
  const envelope: StorageEnvelope = {
    envelopeVersion: 1,
    payload,
    checksum: checksum(payload)
  };
  return JSON.stringify(envelope);
};

const decodeEnvelope = (raw: string): unknown => {
  const parsed = JSON.parse(raw) as Partial<StorageEnvelope> | unknown;
  if (
    parsed
    && typeof parsed === 'object'
    && 'envelopeVersion' in parsed
    && parsed.envelopeVersion === 1
    && 'payload' in parsed
    && typeof parsed.payload === 'string'
    && 'checksum' in parsed
    && typeof parsed.checksum === 'string'
  ) {
    if (checksum(parsed.payload) !== parsed.checksum) throw new Error('Stored data checksum mismatch');
    return JSON.parse(parsed.payload) as unknown;
  }
  return parsed;
};

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

const normalizeGameSave = (input: unknown): GameSave | undefined => {
  if (!input || typeof input !== 'object') return undefined;
  const parsed = input as Record<string, unknown>;
  if (typeof parsed.levelId !== 'string' || !parsed.levelId || !parsed.state || !Array.isArray(parsed.buildings)) {
    return undefined;
  }

  const stateInput = parsed.state as Partial<GameState>;
  if (typeof stateInput.levelId !== 'string' || typeof stateInput.cityName !== 'string') return undefined;
  const migratedRandomState = Math.floor(Number(stateInput.randomState ?? 1)) >>> 0;
  const state = {
    ...stateInput,
    day: Math.max(1, Math.floor(Number(stateInput.day ?? 1))),
    hour: Math.max(0, Math.min(24, Number(stateInput.hour ?? 6))),
    money: Number.isFinite(Number(stateInput.money)) ? Number(stateInput.money) : 0,
    randomState: migratedRandomState || 1,
    researchPoints: Math.max(0, Number(stateInput.researchPoints ?? 0)),
    unlockedTechnologyIds: Array.isArray(stateInput.unlockedTechnologyIds)
      ? [...new Set(stateInput.unlockedTechnologyIds.filter((id): id is string => typeof id === 'string'))]
      : [],
    totalRevenue: Math.max(0, Number(stateInput.totalRevenue ?? 0)),
    totalEnergyServed: Math.max(0, Number(stateInput.totalEnergyServed ?? 0)),
    totalShortage: Math.max(0, Number(stateInput.totalShortage ?? 0)),
    completed: stateInput.completed === true,
    failed: stateInput.failed === true
  } as GameState;

  const buildings = (parsed.buildings as Array<Partial<BuildingSnapshot>>)
    .filter((item) => Boolean(item.instanceId && item.configId))
    .map(migrateBuildingSnapshot);

  return {
    version: 2,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    levelId: parsed.levelId,
    state,
    buildings,
    activeEvent: parsed.activeEvent as ActiveEventSnapshot | undefined,
    telemetry: Array.isArray(parsed.telemetry)
      ? (parsed.telemetry as TelemetrySnapshot[]).slice(-48)
      : []
  };
};

const readKey = (key: string): unknown | undefined => {
  const raw = localStorage.getItem(key);
  return raw ? decodeEnvelope(raw) : undefined;
};

export class SaveManager {
  private static recoveryNoticePending = false;

  static saveGame(save: GameSave): boolean {
    try {
      const currentRaw = localStorage.getItem(SAVE_KEY);
      if (currentRaw) {
        try {
          if (normalizeGameSave(decodeEnvelope(currentRaw))) {
            localStorage.setItem(SAVE_BACKUP_KEY, currentRaw);
          }
        } catch {
          // Keep the previous valid backup when the current primary save is corrupt.
        }
      }

      const encoded = encodeEnvelope({ ...save, version: 2, savedAt: new Date().toISOString() });
      localStorage.setItem(SAVE_KEY, encoded);
      return Boolean(normalizeGameSave(decodeEnvelope(localStorage.getItem(SAVE_KEY) ?? '')));
    } catch {
      return false;
    }
  }

  static loadGame(): GameSave | undefined {
    try {
      const primary = normalizeGameSave(readKey(SAVE_KEY));
      if (primary) return primary;
    } catch {
      // Try the verified backup below.
    }

    try {
      const backup = normalizeGameSave(readKey(SAVE_BACKUP_KEY));
      if (!backup) return undefined;
      localStorage.setItem(SAVE_KEY, encodeEnvelope(backup));
      this.recoveryNoticePending = true;
      return backup;
    } catch {
      return undefined;
    }
  }

  static consumeRecoveryNotice(): boolean {
    const recovered = this.recoveryNoticePending;
    this.recoveryNoticePending = false;
    return recovered;
  }

  static clearGame(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_BACKUP_KEY);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  }

  static loadProfile(): PlayerProfile {
    try {
      const parsed = readKey(PROFILE_KEY) as Partial<PlayerProfile> | undefined;
      if (!parsed || !Array.isArray(parsed.completedLevelIds)) return defaultProfile();
      return {
        version: 2,
        completedLevelIds: [...new Set(parsed.completedLevelIds.filter((id): id is string => typeof id === 'string'))],
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
      localStorage.setItem(PROFILE_KEY, encodeEnvelope(profile));
    } catch {
      // The in-memory result is still useful even when persistence is blocked.
    }

    return profile;
  }
}
