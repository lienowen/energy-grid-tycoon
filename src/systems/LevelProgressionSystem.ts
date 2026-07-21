import type { LevelConfig } from './LevelLoader';

export class LevelProgressionSystem {
  static isUnlocked(level: LevelConfig, completedLevelIds: ReadonlySet<string>): boolean {
    const requirements = level.progression.requiresCompletedLevelIds;
    if (requirements.length === 0) return true;

    return level.progression.requirementMode === 'any'
      ? requirements.some((levelId) => completedLevelIds.has(levelId))
      : requirements.every((levelId) => completedLevelIds.has(levelId));
  }

  static getNextLevel(currentLevel: LevelConfig, levels: readonly LevelConfig[]): LevelConfig | undefined {
    const nextLevelId = currentLevel.progression.nextLevelId;
    return nextLevelId ? levels.find((level) => level.id === nextLevelId) : undefined;
  }
}
