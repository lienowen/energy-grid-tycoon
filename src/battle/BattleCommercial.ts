import type { BattleSnapshot } from './types';

export interface BattlePerformanceContext {
  peakCriticalOutageSeconds: number;
  lineBreaks: number;
  routeSwitches: number;
  overloads: number;
}

export interface BattleGrade {
  score: number;
  stars: 0 | 1 | 2 | 3;
  hospitalScore: number;
  batteryScore: number;
  stabilityScore: number;
  speedScore: number;
  recommendation: string;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const gradeBattle = (
  snapshot: BattleSnapshot,
  context: BattlePerformanceContext
): BattleGrade => {
  if (snapshot.status !== 'victory') {
    return {
      score: 0,
      stars: 0,
      hospitalScore: 0,
      batteryScore: 0,
      stabilityScore: 0,
      speedScore: 0,
      recommendation: context.peakCriticalOutageSeconds >= snapshot.criticalOutageLimitSeconds * 0.7
        ? '医院承受的断电时间过长。优先保住通往医院的供电路径，再考虑聚怪。'
        : '不要只守一条线路。提前切换支路，把怪群引到储能充足、温度较低的线路再过载。'
    };
  }

  const hospitalRatio = snapshot.criticalOutageLimitSeconds > 0
    ? 1 - clamp01(context.peakCriticalOutageSeconds / snapshot.criticalOutageLimitSeconds)
    : 1;
  const batteryRatio = snapshot.batteryCapacityMwh > 0
    ? clamp01(snapshot.batteryEnergyMwh / snapshot.batteryCapacityMwh)
    : 1;
  const stabilityRatio = 1 - clamp01(context.lineBreaks / 3);
  const speedRatio = clamp01((120 - snapshot.elapsedSeconds) / 45);

  const hospitalScore = Math.round(hospitalRatio * 45);
  const batteryScore = Math.round(batteryRatio * 25);
  const stabilityScore = Math.round(stabilityRatio * 15);
  const speedScore = Math.round(speedRatio * 15);
  const score = hospitalScore + batteryScore + stabilityScore + speedScore;
  const stars: 1 | 2 | 3 = score >= 80 ? 3 : score >= 58 ? 2 : 1;

  let recommendation = '防线已经稳定。下一次可以更早聚怪、减少无效等待，冲击三星。';
  if (context.peakCriticalOutageSeconds > 18) {
    recommendation = '医院断电时间偏长。切线路前先确认备用供电路径仍然连通。';
  } else if (batteryRatio < 0.18) {
    recommendation = '储能消耗偏高。等两只以上怪物进入同一线路后再过载，会更划算。';
  } else if (context.lineBreaks > 0) {
    recommendation = '有线路发生熔断。轮换过载线路，让高温线路先冷却。';
  }

  return {
    score,
    stars,
    hospitalScore,
    batteryScore,
    stabilityScore,
    speedScore,
    recommendation
  };
};
