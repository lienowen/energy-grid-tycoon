import type { LevelSceneLayout } from './LevelSceneLayout';

const dawnCityLayout: LevelSceneLayout = {
  levelId: 'city-01',
  mode: 'authored',
  focus: { x: 55, y: 50, elevation: 0 },
  camera: {
    startZoom: 1.34,
    minZoom: 0.56,
    maxZoom: 2.1,
    startOffsetX: 0,
    startOffsetY: 38,
    panLimitX: 210,
    panLimitY: 160
  },
  districts: [
    {
      id: 'dawn-residential',
      label: '居住区',
      kind: 'residential',
      x: 77,
      y: 28,
      width: 21,
      depth: 14,
      scale: 0.9,
      buildingCount: 7,
      priority: 1,
      variant: 11
    },
    {
      id: 'dawn-commercial',
      label: '商业区',
      kind: 'commercial',
      x: 34,
      y: 35,
      width: 20,
      depth: 15,
      scale: 0.91,
      buildingCount: 6,
      priority: 2,
      variant: 23
    },
    {
      id: 'dawn-industrial',
      label: '工业区',
      kind: 'industrial',
      x: 76,
      y: 72,
      width: 21,
      depth: 15,
      scale: 0.92,
      buildingCount: 5,
      priority: 3,
      variant: 37
    },
    {
      id: 'dawn-public',
      label: '公共服务区',
      kind: 'public',
      x: 55,
      y: 54,
      width: 19,
      depth: 13,
      scale: 0.9,
      buildingCount: 4,
      priority: 0,
      variant: 41
    },
    {
      id: 'dawn-old-town',
      label: '东部老城区',
      kind: 'old_town',
      x: 31,
      y: 70,
      width: 20,
      depth: 15,
      scale: 0.91,
      buildingCount: 6,
      priority: 5,
      variant: 59
    }
  ],
  plotAnchors: [
    { plotId: 'sunrise-neighborhood', x: 33, y: 28, elevation: 0.16, scale: 0.78 },
    { plotId: 'south-outskirts', x: 37, y: 31, elevation: 0.16, scale: 0.76 },
    { plotId: 'north-outskirts', x: 84, y: 39, elevation: 0.16, scale: 0.78 },
    { plotId: 'east-coast', x: 87, y: 45, elevation: 0.2, scale: 0.72 },
    { plotId: 'west-industry', x: 27, y: 56, elevation: 0.14, scale: 0.8 },
    { plotId: 'south-neighborhood', x: 70, y: 78, elevation: 0.14, scale: 0.78 },
    { plotId: 'central-utility', x: 82, y: 72, elevation: 0.14, scale: 0.8 },
    { plotId: 'east-industry', x: 86, y: 62, elevation: 0.14, scale: 0.78 }
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
    { id: 'dawn-central-park', kind: 'park', x: 57, y: 39, width: 18, depth: 10, density: 0.65, variant: 31 }
  ],
  energyNetwork: {
    nodes: [
      {
        id: 'solar-hub',
        label: '太阳能场',
        kind: 'generation',
        x: 35,
        y: 29,
        elevation: 0.24,
        plotIds: ['sunrise-neighborhood', 'south-outskirts'],
        facilityConfigIds: ['solar_basic'],
        capacity: 0.8
      },
      {
        id: 'wind-hub',
        label: '风力发电场',
        kind: 'generation',
        x: 87,
        y: 45,
        elevation: 0.28,
        plotIds: ['east-coast'],
        facilityConfigIds: ['wind_basic', 'wind_offshore'],
        capacity: 1.05
      },
      {
        id: 'reserve-plant',
        label: '应急电站',
        kind: 'generation',
        x: 27,
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
        x: 82,
        y: 72,
        elevation: 0.22,
        plotIds: ['central-utility'],
        facilityConfigIds: ['battery_basic', 'battery_utility'],
        capacity: 1.1
      },
      {
        id: 'main-substation',
        label: '主变电站',
        kind: 'substation',
        x: 67,
        y: 49,
        elevation: 0.16,
        alwaysOperational: true,
        capacity: 1.35
      },
      {
        id: 'west-distribution',
        label: '西部配电',
        kind: 'distribution',
        x: 57,
        y: 52,
        elevation: 0.1,
        alwaysOperational: true,
        capacity: 1.15
      },
      {
        id: 'east-distribution',
        label: '东部配电',
        kind: 'distribution',
        x: 79,
        y: 56,
        elevation: 0.1,
        alwaysOperational: true,
        capacity: 1.05
      },
      {
        id: 'residential-load',
        label: '居住区',
        kind: 'district',
        x: 77,
        y: 28,
        elevation: 0.1,
        districtId: 'dawn-residential',
        capacity: 0.9
      },
      {
        id: 'commercial-load',
        label: '商业区',
        kind: 'district',
        x: 34,
        y: 35,
        elevation: 0.1,
        districtId: 'dawn-commercial',
        capacity: 1.05
      },
      {
        id: 'industrial-load',
        label: '工业区',
        kind: 'district',
        x: 76,
        y: 72,
        elevation: 0.1,
        districtId: 'dawn-industrial',
        capacity: 1.2
      },
      {
        id: 'public-load',
        label: '公共服务区',
        kind: 'district',
        x: 55,
        y: 54,
        elevation: 0.1,
        districtId: 'dawn-public',
        capacity: 0.85
      },
      {
        id: 'old-town-load',
        label: '东部老城区',
        kind: 'district',
        x: 31,
        y: 70,
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
        points: [{ x: 35, y: 29 }, { x: 45, y: 36 }, { x: 57, y: 43 }, { x: 67, y: 49 }]
      },
      {
        id: 'reserve-to-main',
        from: 'reserve-plant',
        to: 'main-substation',
        capacity: 1.2,
        points: [{ x: 27, y: 56 }, { x: 41, y: 54 }, { x: 55, y: 51 }, { x: 67, y: 49 }]
      },
      {
        id: 'main-to-west',
        from: 'main-substation',
        to: 'west-distribution',
        capacity: 1.25,
        points: [{ x: 67, y: 49 }, { x: 62, y: 50 }, { x: 57, y: 52 }]
      },
      {
        id: 'west-to-east',
        from: 'west-distribution',
        to: 'east-distribution',
        capacity: 1.05,
        points: [{ x: 57, y: 52 }, { x: 68, y: 53 }, { x: 79, y: 56 }]
      },
      {
        id: 'wind-to-east',
        from: 'wind-hub',
        to: 'east-distribution',
        capacity: 0.95,
        points: [{ x: 87, y: 45 }, { x: 84, y: 49 }, { x: 81, y: 53 }, { x: 79, y: 56 }]
      },
      {
        id: 'storage-to-east',
        from: 'storage-hub',
        to: 'east-distribution',
        capacity: 1,
        points: [{ x: 82, y: 72 }, { x: 82, y: 66 }, { x: 80, y: 60 }, { x: 79, y: 56 }]
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
