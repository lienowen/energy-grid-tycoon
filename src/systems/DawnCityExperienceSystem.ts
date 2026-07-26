import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { GameState } from '../core/GameState';
import type { TechnologyConfig } from './ResearchSystem';

export type DawnCityExperienceTone = 'calm' | 'warning' | 'danger' | 'success';

export type DawnCityExperienceAction =
  | { type: 'build'; buildingId: string }
  | { type: 'openPanel'; panel: 'market' | 'research' | 'policy' | 'fleet' | 'analytics' }
  | { type: 'gridOperation'; edgeId: string; operation: 'toggle' | 'repair' }
  | { type: 'wait' };

export type DawnCityExperienceBeatId = 'stabilize' | 'store' | 'develop' | 'prosper';

export interface DawnCityExperienceBeat {
  id: DawnCityExperienceBeatId;
  stage: number;
  totalStages: 4;
  tone: DawnCityExperienceTone;
  title: string;
  message: string;
  consequence: string;
  actionLabel: string;
  action: DawnCityExperienceAction;
  progress: number;
  nextPromise: string;
}

export interface DawnCityExperienceContext {
  state: Readonly<GameState>;
  buildings: readonly BuildingBase[];
  availableBuildings: readonly BuildingConfig[];
  technologies: readonly TechnologyConfig[];
  goalProgress: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const findAvailable = (
  context: DawnCityExperienceContext,
  id: string
): BuildingConfig | undefined => context.availableBuildings.find((building) => building.id === id);

const firstResearchTarget = (context: DawnCityExperienceContext): TechnologyConfig | undefined => {
  const unlocked = new Set(context.state.unlockedTechnologyIds);
  return context.technologies.find((technology) =>
    !unlocked.has(technology.id)
    && technology.prerequisites.every((id) => unlocked.has(id))
  );
};

export class DawnCityExperienceSystem {
  static evaluate(context: DawnCityExperienceContext): DawnCityExperienceBeat | undefined {
    const { state } = context;
    if (state.levelId !== 'city-01' || state.completed || state.failed) return undefined;

    const industrialFaulted = state.gridEdgeFaulted?.['east-to-industrial'] ?? false;
    const tieEnabled = state.gridEdgeEnabled?.['west-to-industrial-tie'] ?? false;

    if (industrialFaulted && !tieEnabled) {
      return {
        id: 'stabilize',
        stage: 1,
        totalStages: 4,
        tone: 'danger',
        title: '工业区主线路故障，先做临时转供',
        message: '东部配电到工业区的主线已经故障。先投入西部备用联络线，恢复部分工业负荷，再安排永久抢修。',
        consequence: '备用线容量有限，只能降低停电损失，不能代替主线路。',
        actionLabel: '投入备用联络线',
        action: { type: 'gridOperation', edgeId: 'west-to-industrial-tie', operation: 'toggle' },
        progress: 0.12,
        nextPromise: '解锁工业主线抢修'
      };
    }

    if (industrialFaulted && tieEnabled) {
      return {
        id: 'stabilize',
        stage: 1,
        totalStages: 4,
        tone: 'warning',
        title: '临时转供已接通，立即抢修主线路',
        message: '工业区已经恢复部分供电，但备用线路容量很小。支付抢修费用，恢复东部配电到工业区的额定通道。',
        consequence: '抢修将扣除 ¥320，但不会推进游戏时间，也不会额外结算收入。',
        actionLabel: '抢修主线路 ¥320',
        action: { type: 'gridOperation', edgeId: 'east-to-industrial', operation: 'repair' },
        progress: 0.34,
        nextPromise: '恢复工业区主供电'
      };
    }

    if (!industrialFaulted && tieEnabled) {
      return {
        id: 'stabilize',
        stage: 1,
        totalStages: 4,
        tone: 'success',
        title: '主线路已恢复，退出临时转供',
        message: '工业主线已经重新送电。现在断开备用联络线，恢复正常运行方式，避免两条线路长期并列。',
        consequence: '备用联络线退出后仍保留为下一次故障的应急通道。',
        actionLabel: '断开备用联络线',
        action: { type: 'gridOperation', edgeId: 'west-to-industrial-tie', operation: 'toggle' },
        progress: 0.55,
        nextPromise: '进入全城稳定供电任务'
      };
    }

    if (state.supplyRatio < 0.98) {
      const gas = context.buildings.find((building) => building.config.id === 'gas_basic');
      const config = findAvailable(context, 'gas_basic');
      const action: DawnCityExperienceAction = gas && !gas.enabled
        ? { type: 'openPanel', panel: 'fleet' }
        : !gas && config && state.money >= config.cost
          ? { type: 'build', buildingId: config.id }
          : !gas && config
            ? { type: 'openPanel', panel: 'market' }
            : { type: 'wait' };
      const actionLabel = gas && !gas.enabled
        ? '恢复应急电站'
        : !gas && config && state.money >= config.cost
          ? '建设应急电站'
          : !gas && config
            ? '先恢复城市收入'
            : '观察供电变化';

      return {
        id: 'stabilize',
        stage: 1,
        totalStages: 4,
        tone: state.supplyRatio < 0.82 ? 'danger' : 'warning',
        title: '线路已经恢复，补足全城稳定电源',
        message: '电网通道已经正常，但现有发电仍不足。建设稳定电源，让主变电站重新覆盖全部城区。',
        consequence: '供电恢复到 98% 后，城市才会稳定积累发展点和居民信心。',
        actionLabel,
        action,
        progress: 0.55 + clamp01(state.supplyRatio / 0.98) * 0.45,
        nextPromise: '解锁“把白天的电留到夜晚”储能任务'
      };
    }

    if (state.storageCapacity < 900) {
      const storage = findAvailable(context, 'battery_basic');
      const action: DawnCityExperienceAction = storage && state.money >= storage.cost
        ? { type: 'build', buildingId: storage.id }
        : storage
          ? { type: 'openPanel', panel: 'market' }
          : { type: 'wait' };
      return {
        id: 'store',
        stage: 2,
        totalStages: 4,
        tone: 'warning',
        title: '给晚高峰准备一座城市电池',
        message: '现在白天会出现富余电量，但入夜后太阳能下降。建设备用电站，把白天的电保存下来。',
        consequence: '储能建成后，晚高峰不会再立刻把老城区推回停电状态。',
        actionLabel: storage && state.money >= storage.cost ? '建设备用电站' : '为储能准备资金',
        action,
        progress: clamp01(state.storageCapacity / 900),
        nextPromise: '解锁第一项城市技术升级'
      };
    }

    if (state.unlockedTechnologyIds.length < 1) {
      const technology = firstResearchTarget(context);
      const target = Math.max(1, technology?.cost ?? 28);
      const ready = Boolean(technology && state.researchPoints >= technology.cost);
      return {
        id: 'develop',
        stage: 3,
        totalStages: 4,
        tone: ready ? 'success' : 'calm',
        title: ready ? '城市已经准备好第一次升级' : '让稳定供电转化为发展机会',
        message: ready
          ? `发展点已经足够，完成“${technology?.name ?? '城市升级'}”，让这次复电变成长期能力。`
          : '保持全城稳定供电，发展点会持续增加。不要为了追求速度再次制造停电。',
        consequence: ready
          ? '升级完成后，进入最后的城市经营验证。'
          : `还需要约 ${Math.max(0, target - state.researchPoints).toFixed(0)} 点发展点。`,
        actionLabel: ready ? '完成城市升级' : '推进城市运行',
        action: ready ? { type: 'openPanel', panel: 'research' } : { type: 'wait' },
        progress: clamp01(state.researchPoints / target),
        nextPromise: '解锁城市经营验证和下一座城市预告'
      };
    }

    return {
      id: 'prosper',
      stage: 4,
      totalStages: 4,
      tone: context.goalProgress >= 0.82 ? 'success' : 'calm',
      title: context.goalProgress >= 0.82 ? '曙光新城已经能够稳定运转' : '证明这次复电不是一次临时抢修',
      message: '保持全城供电在 98% 以上，检查居民电价和设施开支，让城市累计收入达到 ¥3,000。',
      consequence: '完成后将解锁“工业走廊”，新的工厂负荷和污染取舍会出现。',
      actionLabel: '检查城市经营',
      action: { type: 'openPanel', panel: 'market' },
      progress: clamp01(context.goalProgress),
      nextPromise: '解锁第二关“工业走廊”'
    };
  }
}
