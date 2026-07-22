import type { CityPlotConfig, CityPlotZone } from '../core/CityMapConfig';
import type {
  AmbientBlockKind,
  AmbientBlockSceneState,
  DistrictSceneState,
  RoadSceneState,
  ScenePoint
} from './CitySceneTypes';

export type CityVisualTheme = 'residential' | 'industrial' | 'green';

const zoneLabels: Record<CityPlotZone, string> = {
  neighborhood: '居民社区',
  industrial: '产业区',
  coastal: '海岸能源区',
  outskirts: '城市边缘',
  utility: '公共服务区'
};

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const stableVisualHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededUnit = (seed: string, salt: number): number =>
  (stableVisualHash(`${seed}:${salt}`) % 10000) / 10000;

export const toScenePoint = (
  point: Pick<CityPlotConfig, 'x' | 'y' | 'elevation'>
): ScenePoint => ({
  x: (point.x - 50) * 1.02,
  z: (point.y - 50) * 0.78,
  elevation: point.elevation ?? 0
});

const zonePriority = (theme: CityVisualTheme): CityPlotZone[] => {
  if (theme === 'industrial') return ['industrial', 'utility', 'neighborhood', 'coastal', 'outskirts'];
  if (theme === 'green') return ['neighborhood', 'utility', 'coastal', 'outskirts', 'industrial'];
  return ['neighborhood', 'utility', 'outskirts', 'coastal', 'industrial'];
};

export const makeDistricts = (
  plots: readonly CityPlotConfig[],
  supplyRatio: number,
  theme: CityVisualTheme
): DistrictSceneState[] => {
  const zones = [...new Set(plots.map((plot) => plot.zone))];
  const priority = zonePriority(theme).filter((zone) => zones.includes(zone));
  const powerByZone = new Map<CityPlotZone, number>();
  priority.forEach((zone, index) => {
    const suppliedZones = clamp(supplyRatio * Math.max(1, priority.length) - index, 0, 1);
    powerByZone.set(zone, suppliedZones);
  });

  return zones.map((zone) => {
    const members = plots.filter((plot) => plot.zone === zone);
    const points = members.map(toScenePoint);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minZ = Math.min(...points.map((point) => point.z));
    const maxZ = Math.max(...points.map((point) => point.z));
    return {
      id: zone,
      label: zoneLabels[zone],
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      elevation: -0.35,
      radiusX: Math.max(10, (maxX - minX) / 2 + 8),
      radiusZ: Math.max(7, (maxZ - minZ) / 2 + 5),
      powerRatio: powerByZone.get(zone) ?? supplyRatio
    };
  });
};

export const makeRoads = (
  levelId: string,
  plots: readonly CityPlotConfig[],
  city: ScenePoint,
  population: number,
  supplyRatio: number
): RoadSceneState[] => {
  const baseTraffic = clamp(population / 18000, 0.16, 1) * clamp(0.35 + supplyRatio * 0.75, 0.2, 1);
  const radialRoads = plots.map((plot, index): RoadSceneState => {
    const start = toScenePoint(plot);
    const bend = seededUnit(`${levelId}:${plot.id}`, 1) - 0.5;
    return {
      id: `road-${plot.id}`,
      points: [
        { ...start, elevation: start.elevation - 0.12 },
        {
          x: start.x * 0.52 + city.x * 0.48 + bend * 7,
          z: start.z * 0.52 + city.z * 0.48 - bend * 5,
          elevation: -0.18
        },
        { ...city, elevation: -0.18 }
      ],
      laneCount: plot.zone === 'industrial' || index % 4 === 0 ? 2 : 1,
      traffic: clamp(baseTraffic * (0.62 + seededUnit(plot.id, 3) * 0.58), 0.05, 1),
      powered: supplyRatio > 0.35
    };
  });

  const ordered = [...plots].sort((left, right) => {
    const leftAngle = Math.atan2(left.y - 50, left.x - 50);
    const rightAngle = Math.atan2(right.y - 50, right.x - 50);
    return leftAngle - rightAngle;
  });
  const ring: RoadSceneState[] = [];
  if (ordered.length >= 4) {
    for (let index = 0; index < ordered.length; index += 2) {
      const fromPlot = ordered[index];
      const toPlot = ordered[(index + 2) % ordered.length];
      if (!fromPlot || !toPlot) continue;
      const from = toScenePoint(fromPlot);
      const to = toScenePoint(toPlot);
      ring.push({
        id: `ring-${fromPlot.id}-${toPlot.id}`,
        points: [
          { ...from, elevation: -0.24 },
          { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2, elevation: -0.24 },
          { ...to, elevation: -0.24 }
        ],
        laneCount: 1,
        traffic: clamp(baseTraffic * 0.55, 0.04, 0.7),
        powered: supplyRatio > 0.5
      });
    }
  }
  return [...radialRoads, ...ring];
};

const blockKindForZone = (zone: CityPlotZone, variant: number): AmbientBlockKind => {
  if (zone === 'neighborhood') return 'residential';
  if (zone === 'industrial') return 'industrial';
  if (zone === 'utility') return variant > 0.72 ? 'park' : 'utility';
  if (zone === 'coastal') return variant > 0.5 ? 'utility' : 'park';
  return variant > 0.58 ? 'residential' : 'park';
};

export const makeAmbientBlocks = (
  levelId: string,
  plots: readonly CityPlotConfig[],
  districts: readonly DistrictSceneState[],
  theme: CityVisualTheme
): AmbientBlockSceneState[] => {
  const powerByZone = new Map(districts.map((district) => [district.id, district.powerRatio]));
  const themeMultiplier = theme === 'industrial' ? 1.18 : theme === 'green' ? 0.9 : 1;
  const result: AmbientBlockSceneState[] = [];

  plots.forEach((plot) => {
    const origin = toScenePoint(plot);
    const count = plot.zone === 'coastal' ? 1 : plot.zone === 'neighborhood' ? 3 : 2;
    for (let index = 0; index < count; index += 1) {
      const seed = `${levelId}:${plot.id}:block:${index}`;
      const angle = seededUnit(seed, 1) * Math.PI * 2;
      const distance = 7.5 + seededUnit(seed, 2) * 7.5;
      const variant = seededUnit(seed, 3);
      const kind = blockKindForZone(plot.zone, variant);
      const isPark = kind === 'park';
      const heightBase = kind === 'industrial' ? 4.5 : kind === 'utility' ? 5.5 : 7;
      const height = isPark ? 0.8 : (heightBase + seededUnit(seed, 4) * 9) * themeMultiplier;
      result.push({
        id: `${plot.id}-ambient-${index}`,
        zone: plot.zone,
        kind,
        x: origin.x + Math.cos(angle) * distance,
        z: origin.z + Math.sin(angle) * distance,
        elevation: -0.05,
        width: isPark ? 4.5 : 3.5 + seededUnit(seed, 5) * 3.6,
        depth: isPark ? 3.2 : 2.8 + seededUnit(seed, 6) * 2.8,
        height,
        floors: isPark ? 0 : Math.max(2, Math.round(height / 2.4)),
        lightSeed: stableVisualHash(seed),
        powerRatio: powerByZone.get(plot.zone) ?? 1
      });
    }
  });
  return result;
};
