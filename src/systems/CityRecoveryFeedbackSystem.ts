import type { DawnCityExperienceBeatId } from './DawnCityExperienceSystem';
import type { DistrictPrefabStatus } from '../presentation/CitySceneTypes';

export type CityRecoveryFeedbackTone = 'success' | 'warning' | 'danger' | 'celebration';

export interface CityRecoveryDistrictSnapshot {
  id: string;
  label: string;
  status: DistrictPrefabStatus;
}

export interface CityRecoverySnapshot {
  levelId: string;
  completed: boolean;
  beatId?: DawnCityExperienceBeatId;
  districts: readonly CityRecoveryDistrictSnapshot[];
}

export interface CityRecoveryFeedbackEvent {
  id: string;
  tone: CityRecoveryFeedbackTone;
  title: string;
  message: string;
  priority: number;
}

const statusRank: Record<DistrictPrefabStatus, number> = {
  offline: 0,
  blackout: 1,
  warning: 2,
  normal: 3
};

const beatOrder: Record<DawnCityExperienceBeatId, number> = {
  stabilize: 1,
  store: 2,
  develop: 3,
  prosper: 4
};

const completedBeatCopy: Record<DawnCityExperienceBeatId, { title: string; message: string }> = {
  stabilize: {
    title: '全城复电完成',
    message: '主变电站重新覆盖全部城区，城市从应急状态转入稳定运营。'
  },
  store: {
    title: '城市储能上线',
    message: '白天的富余电力现在可以留到晚高峰，下一次波动不再只能被动停电。'
  },
  develop: {
    title: '第一次城市升级完成',
    message: '复电成果已经变成长期能力，曙光新城进入最后的经营冲刺。'
  },
  prosper: {
    title: '曙光新城兑现承诺',
    message: '这套能源系统已经具备持续运营能力，工业走廊正式开放。'
  }
};

const aggregateDistricts = (
  districts: readonly CityRecoveryDistrictSnapshot[],
  singularSuffix: string,
  pluralTitle: string
): { title: string; message: string } => {
  if (districts.length === 1) {
    return {
      title: `${districts[0]?.label ?? '城区'}${singularSuffix}`,
      message: districts[0]?.label
        ? `${districts[0].label}的照明、公共服务和生活秩序正在恢复。`
        : '城区照明、公共服务和生活秩序正在恢复。'
    };
  }
  return {
    title: `${districts.length} 个${pluralTitle}`,
    message: districts.map((district) => district.label).join('、')
  };
};

export class CityRecoveryFeedbackSystem {
  static detect(
    previous: CityRecoverySnapshot | undefined,
    next: CityRecoverySnapshot
  ): CityRecoveryFeedbackEvent[] {
    if (!previous || previous.levelId !== next.levelId) return [];

    const events: CityRecoveryFeedbackEvent[] = [];
    const previousDistricts = new Map(previous.districts.map((district) => [district.id, district]));
    const recovered: CityRecoveryDistrictSnapshot[] = [];
    const degraded: CityRecoveryDistrictSnapshot[] = [];

    for (const district of next.districts) {
      const before = previousDistricts.get(district.id);
      if (!before || before.status === district.status) continue;
      if (district.status === 'normal' && statusRank[district.status] > statusRank[before.status]) {
        recovered.push(district);
      } else if (
        statusRank[district.status] < statusRank[before.status]
        && (district.status === 'blackout' || district.status === 'offline')
      ) {
        degraded.push(district);
      }
    }

    if (recovered.length > 0) {
      const copy = aggregateDistricts(recovered, '恢复供电', '城区恢复供电');
      events.push({
        id: `district-recovered-${recovered.map((district) => district.id).join('-')}`,
        tone: 'success',
        title: copy.title,
        message: copy.message,
        priority: 60
      });
    }

    if (degraded.length > 0) {
      const copy = aggregateDistricts(degraded, '进入停电状态', '城区失去稳定供电');
      events.push({
        id: `district-degraded-${degraded.map((district) => district.id).join('-')}`,
        tone: 'danger',
        title: copy.title,
        message: copy.message,
        priority: 90
      });
    }

    if (
      previous.beatId
      && next.beatId
      && beatOrder[next.beatId] > beatOrder[previous.beatId]
    ) {
      const copy = completedBeatCopy[previous.beatId];
      events.push({
        id: `experience-${previous.beatId}-complete`,
        tone: previous.beatId === 'develop' ? 'celebration' : 'success',
        title: copy.title,
        message: copy.message,
        priority: previous.beatId === 'develop' ? 100 : 80
      });
    }

    if (!previous.completed && next.completed) {
      events.push({
        id: 'scenario-complete',
        tone: 'celebration',
        title: completedBeatCopy.prosper.title,
        message: completedBeatCopy.prosper.message,
        priority: 120
      });
    }

    return events.sort((left, right) => right.priority - left.priority);
  }
}
