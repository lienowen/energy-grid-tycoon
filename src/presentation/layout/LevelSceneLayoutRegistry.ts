import type { LevelSceneLayout } from './LevelSceneLayout';

const dawnCityLayout: LevelSceneLayout = {
  levelId: 'city-01',
  mode: 'authored',
  focus: { x: 54, y: 50, elevation: 0 },
  camera: {
    startZoom: 1.47,
    minZoom: 0.52,
    maxZoom: 2.1,
    startOffsetX: 0,
    startOffsetY: 8,
    panLimitX: 190,
    panLimitY: 145
  },
  districts: [
    {
      id: 'dawn-residential',
      label: '居住区',
      kind: 'residential',
      x: 69,
      y: 32,
      width: 23,
      depth: 15,
      scale: 1.06,
      buildingCount: 7,
      priority: 1,
      variant: 11
    },
    {
      id: 'dawn-commercial',
      label: '商业区',
      kind: 'commercial',
      x: 40,
      y: 38,
      width: 23,
      depth: 16,
      scale: 1.12,
      buildingCount: 6,
      priority: 2,
      variant: 23
    },
    {
      id: 'dawn-industrial',
      label: '工业区',
      kind: 'industrial',
      x: 70,
      y: 66,
      width: 23,
      depth: 16,
      scale: 1.05,
      buildingCount: 5,
      priority: 3,
      variant: 37
    },
    {
      id: 'dawn-public',
      label: '公共服务区',
      kind: 'public',
      x: 55,
      y: 52,
      width: 21,
      depth: 14,
      scale: 1.08,
      buildingCount: 4,
      priority: 0,
      variant: 41
    },
    {
      id: 'dawn-old-town',
      label: '东部老城区',
      kind: 'old_town',
      x: 39,
      y: 65,
      width: 22,
      depth: 16,
      scale: 1.04,
      buildingCount: 6,
      priority: 5,
      variant: 59
    }
  ],
  plotAnchors: [
    { plotId: 'sunrise-neighborhood', x: 36, y: 31, elevation: 0.16, scale: 0.86 },
    { plotId: 'south-outskirts', x: 40, y: 34, elevation: 0.16, scale: 0.84 },
    { plotId: 'north-outskirts', x: 77, y: 39, elevation: 0.16, scale: 0.86 },
    { plotId: 'east-coast', x: 82, y: 44, elevation: 0.2, scale: 0.8 },
    { plotId: 'west-industry', x: 31, y: 56, elevation: 0.14, scale: 0.88 },
    { plotId: 'south-neighborhood', x: 64, y: 74, elevation: 0.14, scale: 0.86 },
    { plotId: 'central-utility', x: 76, y: 68, elevation: 0.14, scale: 0.88 },
    { plotId: 'east-industry', x: 82, y: 61, elevation: 0.14, scale: 0.86 }
  ],
  // The live city view uses one authored road layer. Keeping a second vector
  // backbone here made the map read as stacked strips instead of one city.
  roads: [],
  environment: [
    { id: 'dawn-west-water', kind: 'water', x: 5, y: 51, width: 25, depth: 94, density: 0.7, variant: 3 },
    { id: 'dawn-south-coast', kind: 'coast', x: 51, y: 93, width: 100, depth: 17, density: 0.8, variant: 7 },
    { id: 'dawn-north-ridge', kind: 'ridge', x: 61, y: 4, width: 86, depth: 17, density: 0.9, variant: 13 },
    { id: 'dawn-north-forest', kind: 'forest', x: 36, y: 10, width: 46, depth: 16, density: 0.82, variant: 17 },
    { id: 'dawn-east-forest', kind: 'forest', x: 99, y: 46, width: 16, depth: 72, density: 0.88, variant: 29 },
    { id: 'dawn-central-park', kind: 'park', x: 55, y: 45, width: 24, depth: 12, density: 0.72, variant: 31 }
  ],
  energyNetwork: {
    nodes: [
      {
        id: 'solar-hub',
        label: '太阳能场',
        kind: 'generation',
        x: 36,
        y: 31,
        elevation: 0.24,
        plotIds: ['sunrise-neighborhood', 'south-outskirts'],
        facilityConfigIds: ['solar_basic'],
        capacity: 0.8
      },
      {
        id: 'wind-hub',
        label: '风力发电场',
        kind: 'generation',
        x: 82,
        y: 44,
        elevation: 0.28,
        plotIds: ['east-coast'],
        facilityConfigIds: ['wind_basic', 'wind_offshore'],
        capacity: 1.05
      },
      {
        id: 'reserve-plant',
        label: '应急电站',
        kind: 'generation',
        x: 31,
        y: 56,
        elevation: 0.2,
        plotIds: ['west-industry'],
        facilityConfigIds: ['gas_basic'],
        capacity: 1.2
      },
      {
        id: 'storage-hub',
        label: '城市储能站',
        kind: 'storage',
        x: 76,
        y: 68,
        elevation: 0.22,
        plotIds: ['central-utility'],
        facilityConfigIds: ['battery_basic', 'battery_utility'],
        capacity: 1.1
      },
      {
        id: 'main-substation',
        label: '主变电站',
        kind: 'substation',
        x: 63,
        y: 49,
        elevation: 0.16,
        alwaysOperational: true,
        capacity: 1.35
      },
      {
        id: 'west-distribution',
        label: '西部配电',
        kind: 'distribution',
        x: 54,
        y: 52,
        elevation: 0.1,
        alwaysOperational: true,
        capacity: 1.15
      },
      {
        id: 'east-distribution',
        label: '东部配电',
        kind: 'distribution',
        x: 71,
        y: 55,
        elevation: 0.1,
        alwaysOperational: true,
        capacity: 1.05
      },
      {
        id: 'residential-load',
        label: '居住区',
        kind: 'district',
        x: 69,
        y: 32,
        elevation: 0.1,
        districtId: 'dawn-residential',
        capacity: 0.9
      },
      {
        id: 'commercial-load',
        label: '商业区',
        kind: 'district',
        x: 40,
        y: 38,
        elevation: 0.1,
        districtId: 'dawn-commercial',
        capacity: 1.05
      },
      {
        id: 'industrial-load',
        label: '工业区',
        kind: 'district',
        x: 70,
        y: 66,
        elevation: 0.1,
        districtId: 'dawn-industrial',
        capacity: 1.2
      },
      {
        id: 'public-load',
        label: '公共服务区',
        kind: 'district',
        x: 55,
        y: 52,
        elevation: 0.1,
        districtId: 'dawn-public',
        capacity: 0.85
      },
      {
        id: 'old-town-load',
        label: '东部老城区',
        kind: 'district',
        x: 39,
        y: 65,
        elevation: 0.1,
        districtId: 'dawn-old-town',
        capacity: 0.8
      }
    ],
    edges: [
      {
        id: 'solar-to-main',
        from: 'solar-hub',
        to: 'main-substation',
        capacity: 0.78,
        points: [{ x: 36, y: 31 }, { x: 45, y: 36 }, { x: 55, y: 43 }, { x: 63, y: 49 }]
      },
      {
        id: 'reserve-to-main',
        from: 'reserve-plant',
        to: 'main-substation',
        capacity: 1.2,
        points: [{ x: 31, y: 56 }, { x: 42, y: 54 }, { x: 53, y: 51 }, { x: 63, y: 49 }]
      },
      {
        id: 'main-to-west',
        from: 'main-substation',
        to: 'west-distribution',
        capacity: 1.25,
        points: [{ x: 63, y: 49 }, { x: 59, y: 50 }, { x: 54, y: 52 }]
      },
      {
        id: 'west-to-east',
        from: 'west-distribution',
        to: 'east-distribution',
        capacity: 1.05,
        points: [{ x: 54, y: 52 }, { x: 63, y: 53 }, { x: 71, y: 55 }]
      },
      {
        id: 'wind-to-east',
        from: 'wind-hub',
        to: 'east-distribution',
        capacity: 0.95,
        points: [{ x: 82, y: 44 }, { x: 79, y: 48 }, { x: 75, y: 52 }, { x: 71, y: 55 }]
      },
      {
        id: 'storage-to-east',
        from: 'storage-hub',
        to: 'east-distribution',
        capacity: 1,
        points: [{ x: 76, y: 68 }, { x: 75, y: 63 }, { x: 73, y: 59 }, { x: 71, y: 55 }]
      },
      { id: 'west-to-residential', from: 'west-distribution', to: 'residential-load', capacity: 0.92 },
      { id: 'west-to-commercial', from: 'west-distribution', to: 'commercial-load', capacity: 1 },
      { id: 'west-to-public', from: 'west-distribution', to: 'public-load', capacity: 0.86 },
      { id: 'east-to-industrial', from: 'east-distribution', to: 'industrial-load', capacity: 1.1 },
      { id: 'east-to-public', from: 'east-distribution', to: 'public-load', capacity: 0.82 },
      { id: 'east-to-old-town', from: 'east-distribution', to: 'old-town-load', capacity: 0.76 }
    ]
  }
};

const layouts = new Map<string, LevelSceneLayout>([[dawnCityLayout.levelId, dawnCityLayout]]);

export class LevelSceneLayoutRegistry {
  static resolve(levelId: string): LevelSceneLayout | undefined {
    return layouts.get(levelId);
  }
}
