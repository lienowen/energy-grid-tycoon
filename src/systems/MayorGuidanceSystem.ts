import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { GameState } from '../core/GameState';
import type { TechnologyConfig } from './ResearchSystem';

export type MayorGuidePanel = 'market' | 'research' | 'policy' | 'fleet' | 'analytics';

export type MayorGuideAction =
  | { type: 'build'; buildingId: string }
  | { type: 'openPanel'; panel: MayorGuidePanel }
  | { type: 'wait' };

export interface MayorGuidance {
  tone: 'calm' | 'warning' | 'danger' | 'success';
  headline: string;
  message: string;
  consequence: string;
  actionLabel: string;
  action: MayorGuideAction;
}

export interface MayorGuidanceContext {
  state: Readonly<GameState>;
  buildings: readonly BuildingBase[];
  availableBuildings: readonly BuildingConfig[];
  technologies: readonly TechnologyConfig[];
  activePolicyId?: string;
  briefing?: readonly string[];
  goalProgress: number;
}

const bestAffordable = (
  buildings: readonly BuildingConfig[],
  money: number,
  category: BuildingConfig['category']
): BuildingConfig | undefined => buildings
  .filter((building) => building.category === category && building.cost <= money)
  .sort((left, right) => {
    const leftValue = category === 'storage' ? (left.capacity ?? 0) : left.power;
    const rightValue = category === 'storage' ? (right.capacity ?? 0) : right.power;
    return rightValue / Math.max(1, right.cost) - leftValue / Math.max(1, left.cost);
  })[0];

const availableTechnology = (context: MayorGuidanceContext): TechnologyConfig | undefined => {
  const unlocked = new Set(context.state.unlockedTechnologyIds);
  return context.technologies.find((technology) =>
    !unlocked.has(technology.id)
    && technology.cost <= context.state.researchPoints
    && technology.prerequisites.every((id) => unlocked.has(id))
  );
};

export class MayorGuidanceSystem {
  static evaluate(context: MayorGuidanceContext): MayorGuidance {
    const { state } = context;

    if (state.completed) {
      return {
        tone: 'success',
        headline: '市民认可了你的治理',
        message: '这座城市已经完成当前承诺，可以前往下一座城市。',
        consequence: '本关成绩已经记录。',
        actionLabel: '查看城市成绩',
        action: { type: 'openPanel', panel: 'analytics' }
      };
    }

    if (state.failed) {
      return {
        tone: 'danger',
        headline: '城市需要重新规划',
        message: '当前局面已经无法维持，重新挑战会从本关初始条件开始。',
        consequence: '失败不会影响已完成的城市。',
        actionLabel: '查看发生了什么',
        action: { type: 'openPanel', panel: 'analytics' }
      };
    }

    if (state.supplyRatio < 0.9) {
      const generator = bestAffordable(context.availableBuildings, state.money, 'generation');
      if (generator) {
        return {
          tone: 'danger',
          headline: '部分街区快要停电了',
          message: `先建一座${generator.name}，让居民和商店恢复正常用电。`,
          consequence: `会增加供电能力，同时每段时间要支付维护费用。`,
          actionLabel: `建设${generator.name}`,
          action: { type: 'build', buildingId: generator.id }
        };
      }
      const offline = context.buildings.find((building) => !building.enabled);
      if (offline) {
        return {
          tone: 'danger',
          headline: '有设施没有工作',
          message: `先重新启动${offline.config.name}，它能立刻缓解停电。`,
          consequence: '重新启动后会恢复维护支出。',
          actionLabel: '查看城市设施',
          action: { type: 'openPanel', panel: 'fleet' }
        };
      }
      return {
        tone: 'danger',
        headline: '市政资金不足以扩建',
        message: '先检查居民电费和现有设施，尽快让城市恢复收入。',
        consequence: '电费太高会让居民不满，调整时要留出余地。',
        actionLabel: '调整居民电费',
        action: { type: 'openPanel', panel: 'market' }
      };
    }

    if (state.storageCapacity <= 0) {
      const storage = bestAffordable(context.availableBuildings, state.money, 'storage');
      if (storage) {
        return {
          tone: 'warning',
          headline: '白天多出来的电正在浪费',
          message: `建设${storage.name}，白天存电，晚上居民用电高峰时再放出来。`,
          consequence: '能减少晚间停电，也会占用一部分市政资金。',
          actionLabel: `建设${storage.name}`,
          action: { type: 'build', buildingId: storage.id }
        };
      }
    }

    const technology = availableTechnology(context);
    if (technology) {
      return {
        tone: 'calm',
        headline: '城市积累了新的发展机会',
        message: `现在可以推进“${technology.name}”，让城市以后更省钱或更稳定。`,
        consequence: '会消耗发展点，但效果会长期保留。',
        actionLabel: '选择城市升级',
        action: { type: 'openPanel', panel: 'research' }
      };
    }

    if (!context.activePolicyId && state.day >= 2) {
      return {
        tone: 'calm',
        headline: '市民在等你的施政方向',
        message: '选择更照顾居民、发展产业，或优先改善环境。',
        consequence: '每项方向都有收益，也会带来新的取舍。',
        actionLabel: '选择施政方向',
        action: { type: 'openPanel', panel: 'policy' }
      };
    }

    if (state.satisfaction < 55) {
      return {
        tone: 'warning',
        headline: '居民对城市生活不太满意',
        message: '检查电费是否太高，也看看城市是否经常停电。',
        consequence: '长期不满会让人口减少。',
        actionLabel: '听取居民意见',
        action: { type: 'openPanel', panel: 'market' }
      };
    }

    const briefing = context.briefing?.find(Boolean);
    return {
      tone: context.goalProgress >= 0.72 ? 'success' : 'calm',
      headline: context.goalProgress >= 0.72 ? '你的城市正在接近承诺' : '市长，下一步这样做',
      message: briefing ?? '保持全城有电，同时留足资金应对突发情况。',
      consequence: context.goalProgress >= 0.72
        ? '继续保持当前状态，就能完成这座城市的目标。'
        : '建设前先看资金，避免一次投入过多。',
      actionLabel: context.goalProgress >= 0.72 ? '查看城市进展' : '查看居民用电',
      action: { type: 'openPanel', panel: context.goalProgress >= 0.72 ? 'analytics' : 'market' }
    };
  }
}
