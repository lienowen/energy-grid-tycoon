import type { CityPlotConfig, CityPlotZone } from '../core/CityMapConfig';
import type {
  CitizenFeedbackSceneState,
  CityGrowthSceneState,
  DistrictSceneState,
  ExpansionSiteSceneState
} from './CitySceneTypes';
import { stableVisualHash, toScenePoint } from './CitySceneVisuals';

export interface CityGrowthInput {
  initialPopulation: number;
  population: number;
  day: number;
}

export interface CitizenFeedbackInput {
  levelId: string;
  day: number;
  hour: number;
  satisfaction: number;
  pollutionRatio: number;
  supplyRatio: number;
  demandRatio: number;
  districts: readonly DistrictSceneState[];
}

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const seededUnit = (seed: string, salt: number): number =>
  (stableVisualHash(`${seed}:${salt}`) % 10000) / 10000;

const stageLabels: Record<CityGrowthSceneState['stage'], string> = {
  1: '城市起步',
  2: '街区扩建',
  3: '城市成形',
  4: '都会繁荣'
};

export const calculateCityGrowth = ({
  initialPopulation,
  population,
  day
}: CityGrowthInput): CityGrowthSceneState => {
  const safeInitial = Math.max(1, initialPopulation);
  const populationProgress = clamp(
    (population - safeInitial) / Math.max(1200, safeInitial * 0.55)
  );
  const timeProgress = clamp((day - 1) / 18) * 0.18;
  const progress = clamp(populationProgress * 0.82 + timeProgress);
  const stage = Math.min(4, 1 + Math.floor(progress * 4)) as CityGrowthSceneState['stage'];
  return { stage, progress, label: stageLabels[stage] };
};

const expansionZonePriority: CityPlotZone[] = [
  'outskirts',
  'neighborhood',
  'utility',
  'industrial',
  'coastal'
];

export const makeExpansionSites = (
  levelId: string,
  plots: readonly CityPlotConfig[],
  growth: CityGrowthSceneState
): ExpansionSiteSceneState[] => {
  if (growth.progress < 0.08 || plots.length === 0) return [];
  const sorted = [...plots].sort((left, right) => {
    const zoneDifference = expansionZonePriority.indexOf(left.zone)
      - expansionZonePriority.indexOf(right.zone);
    if (zoneDifference !== 0) return zoneDifference;
    return stableVisualHash(`${levelId}:${left.id}`) - stableVisualHash(`${levelId}:${right.id}`);
  });
  const count = Math.min(3, Math.max(1, growth.stage - 1));
  return sorted.slice(0, count).map((plot, index) => {
    const origin = toScenePoint(plot);
    const angle = seededUnit(`${levelId}:${plot.id}:expansion`, 1) * Math.PI * 2;
    const distance = 8 + seededUnit(`${levelId}:${plot.id}:expansion`, 2) * 6;
    const stageStart = index / 4;
    const localProgress = clamp((growth.progress - stageStart) * 2.2);
    return {
      id: `expansion-${plot.id}`,
      zone: plot.zone,
      x: origin.x + Math.cos(angle) * distance,
      z: origin.z + Math.sin(angle) * distance,
      elevation: 0.05,
      progress: localProgress,
      scale: 0.82 + seededUnit(plot.id, 9) * 0.32,
      label: index === 0 ? '新区施工' : '街区扩建'
    };
  });
};

const districtAnchor = (
  district: DistrictSceneState,
  seed: string,
  index: number
): Pick<CitizenFeedbackSceneState, 'x' | 'z' | 'elevation' | 'phase'> => ({
  x: district.x + (seededUnit(seed, index * 2 + 1) - 0.5) * district.radiusX * 0.7,
  z: district.z + (seededUnit(seed, index * 2 + 2) - 0.5) * district.radiusZ * 0.7,
  elevation: 4.5,
  phase: seededUnit(seed, index * 3 + 7)
});

const feedbackForState = (input: CitizenFeedbackInput): Array<{
  message: string;
  tone: CitizenFeedbackSceneState['tone'];
  priority: number;
  district: DistrictSceneState;
}> => {
  const districts = [...input.districts];
  if (districts.length === 0) return [];
  const weakest = [...districts].sort((left, right) => left.powerRatio - right.powerRatio)[0] ?? districts[0];
  const busiest = [...districts].sort((left, right) => right.demandIntensity - left.demandIntensity)[0] ?? districts[0];
  const residential = districts.find((district) => district.id === 'neighborhood') ?? busiest;
  const industrial = districts.find((district) => district.id === 'industrial') ?? busiest;
  const messages: Array<{
    message: string;
    tone: CitizenFeedbackSceneState['tone'];
    priority: number;
    district: DistrictSceneState;
  }> = [];

  if (input.supplyRatio < 0.72 && weakest) {
    messages.push({ message: '这片街区又暗下来了', tone: 'danger', priority: 100, district: weakest });
  } else if (input.supplyRatio < 0.94 && weakest) {
    messages.push({ message: '今晚用电有点紧张', tone: 'warning', priority: 82, district: weakest });
  }
  if (input.pollutionRatio > 0.62 && industrial) {
    messages.push({ message: '空气有点呛，少点烟吧', tone: 'danger', priority: 92, district: industrial });
  } else if (input.pollutionRatio > 0.38 && industrial) {
    messages.push({ message: '最近天空有点灰', tone: 'warning', priority: 68, district: industrial });
  }
  if (input.satisfaction < 42 && residential) {
    messages.push({ message: '最近生活压力有点大', tone: 'danger', priority: 88, district: residential });
  } else if (input.satisfaction < 62 && residential) {
    messages.push({ message: '希望城市再方便一点', tone: 'neutral', priority: 54, district: residential });
  }
  if (input.demandRatio > 1.18 && busiest) {
    messages.push({ message: '大家现在都在用电', tone: 'warning', priority: 64, district: busiest });
  }
  if (messages.length === 0 && residential) {
    messages.push({
      message: input.satisfaction >= 78 ? '新街区越来越舒服了' : '城市正在慢慢变好',
      tone: input.satisfaction >= 78 ? 'positive' : 'neutral',
      priority: 30,
      district: residential
    });
  }
  return messages.sort((left, right) => right.priority - left.priority).slice(0, 2);
};

export const makeCitizenFeedback = (
  input: CitizenFeedbackInput
): CitizenFeedbackSceneState[] => {
  const timeBucket = `${input.levelId}:${input.day}:${Math.floor(input.hour / 2)}`;
  return feedbackForState(input).map((feedback, index) => ({
    id: `citizen-${stableVisualHash(`${timeBucket}:${feedback.message}:${index}`)}`,
    districtId: feedback.district.id,
    message: feedback.message,
    tone: feedback.tone,
    priority: feedback.priority,
    ...districtAnchor(feedback.district, timeBucket, index)
  }));
};
