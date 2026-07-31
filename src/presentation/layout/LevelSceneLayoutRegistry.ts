import type { LevelSceneLayout } from './LevelSceneLayout';

const dawnCityLayout: LevelSceneLayout = {
  levelId: 'city-01',
  mode: 'authored',
  focus: { x: 56, y: 51, elevation: 0 },
  camera: {
    startZoom: 1.5,
    minZoom: 0.58,
    maxZoom: 2.1,
    startOffsetX: 0,
    startOffsetY: 14,
    panLimitX: 175,
    panLimitY: 135
  },
  districts: [
    {
      id: 'dawn-residential',
      label: '居住区',
      kind: 'residential',
      x: 72,
      y: 34,
      width: 23,
      depth: 15,
      scale: 1.03,
      buildingCount: 7,
      priority: 1,
      variant: 11
    },
    {
      id: 'dawn-commercial',
      label: '商业区',
      kind: 'commercial',
      x: 45,
      y: 45,
      width: 23,
      depth: 16,
      scale: 1.08,
      buildingCount: 6,
      priority: 2,
      variant: 23
    },
    {
      id: 'dawn-industrial',
      label: '工业区',
      kind: 'industrial',
      x: 72,
      y: 68,
      width: 23,
      depth: 16,
      scale: 1.02,
      buildingCount: 5,
      priority: 3,
      variant: 37
    },
    {
      id: 'dawn-public',
      label: '公共服务区',
      kind: 'public',
      x: 56,
      y: 52,
      width: 21,
      depth: 14,
      scale: 1.06,
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
      scale: 1.02,
      buildingCount: 6,
      priority: 5,
      variant: 59
    }
  ],
  plotAnchors: [
    { plotId: 'sunrise-neighborhood', x: 29, y: 27, elevation: 0.16, scale: 0.82 },
    { plotId: 'south-outskirts', x: 34, y: 33, elevation: 0.16, scale: 0.82 },
    { plotId: 'north-outskirts', x: 82, y: 31, elevation: 0.16, scale: 0.82 },
    { plotId: 'east-coast', x: 90, y: 56, elevation: 0.2, scale: 0.62 },
    { plotId: 'west-industry', x: 30, y: 74, elevation: 0.14, scale: 0.72 },
    { plotId: 'south-neighborhood', x: 61, y: 80, elevation: 0.14, scale: 0.82 },
    { plotId: 'central-utility', x: 74, y: 78, elevation: 0.14, scale: 0.7 },
    { plotId: 'east-industry', x: 90, y: 68, elevation: 0.14, scale: 0.82 }
  ],
  // City mode relies on the single authored road surface. Access roads are
  // generated only for diagnostics and no decorative road tiles are added.
  roads: [],
  environment: [
    { id: 'dawn-west-water', kind: 'water', x: 5, y: 51, width: 25, depth: 94, density: 0.7, variant: 3 },
    { id: 'dawn-south-coast', kind: 'coast', x: 51, y: 93, width: 100, depth: 17, density: 0.8, variant: 7 },
    { id: 'dawn-north-ridge', kind: 'ridge', x: 61, y: 4, width: 86, depth: 17, density: 0.9, variant: 13 },
    { id: 'dawn-north-forest', kind: 'forest', x: 36, y: 10, width: 46, depth: 16, density: 0.82, variant: 17 },
    { id: 'dawn-east-forest', kind: 'forest', x: 99, y: 46, width: 16, depth: 72, density: 0.88, variant: 29 },
    { id: 'dawn-central-park', kind: 'park', x: 56, y: 48, width: 24, depth: 12, density: 0.72, variant: 31 }
  ],
  energyNetwork: {
    nodes: [
      {
        id: 'solar-hub',
        label: '太阳能场',
        kind: 'generation',
        x: 29,
        y: 27,
        elevation: 0.24,
        plotIds: ['sunrise-neighborhood', 'south-outskirts'],
        facilityConfigIds: ['solar_basic'],
        capacity: 0.8
      },
      {
        id: 'wind-hub',
        label: '风力发电场',
        kind: 'generation',
        x: 90,
        y: 56,
        elevation: 0.28,
        plotIds: ['east-coast'],
        facilityConfigIds: ['wind_basic', 'wind_offshore'],
        capacity: 1.05
      },
      {
        id: 'reserve-plant',
        label: '应急电站',
        kind: 'generation',
        x: 30,
        y: 74,
        elevation: 0.2,
        plotIds: ['west-industry'],
        facilityConfigIds: ['gas_basic'],
        capacity: 1.2
      },
      {
        id: 'storage-hub',
        label: '城市储能站',
        kind: 'storage',
        x: 74,
        y: 78,
        elevation: 0.22,
        plotIds: ['central-utility'],
        facilityConfigIds: ['battery_basic', 'battery_utility'],
        capacity: 1.1
      },
      {
        id: 'main-substation',
        label: '主变电站',
        kind: 'substation',
        x: 62,
        y: 55,
        elevation: 0.16,
        alwaysOperational: true,
        capacity: 1.35
      },
      {
        id: 'west-distribution',
        label: '西部配电',
        kind: 'distribution',
        x: 51,
        y: 55,
        elevation: 0.1,
        alwaysOperational: true,
        capacity: 1.15
      },
      {
        id: 'east-distribution',
        label: '东部配电',
        kind: 'distribution',
        x: 70,
        y: 57,
        elevation: 0.1,
        alwaysOperational: true,
        capacity: 1.05
      },
      {
        id: 'residential-load',
        label: '居住区',
        kind: 'district',
        x: 72,
        y: 34,
        elevation: 0.1,
        districtId: 'dawn-residential',
        capacity: 0.9
      },
      {
        id: 'commercial-load',
        label: '商业区',
        kind: 'district',
        x: 45,
        y: 45,
        elevation: 0.1,
        districtId: 'dawn-commercial',
        capacity: 1.05
      },
      {
        id: 'industrial-load',
        label: '工业区',
        kind: 'district',
        x: 72,
        y: 68,
        elevation: 0.1,
        districtId: 'dawn-industrial',
        capacity: 1.2
      },
      {
        id: 'public-load',
        label: '公共服务区',
        kind: 'district',
        x: 56,
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
        points: [{ x: 29, y: 27 }, { x: 41, y: 35 }, { x: 52, y: 44 }, { x: 62, y: 55 }]
      },
      {
        id: 'reserve-to-main',
        from: 'reserve-plant',
        to: 'main-substation',
        capacity: 1.2,
        points: [{ x: 30, y: 74 }, { x: 41, y: 68 }, { x: 52, y: 61 }, { x: 62, y: 55 }]
      },
      {
        id: 'main-to-west',
        from: 'main-substation',
        to: 'west-distribution',
        capacity: 1.25,
        points: [{ x: 62, y: 55 }, { x: 57, y: 55 }, { x: 51, y: 55 }]
      },
      {
        id: 'west-to-east',
        from: 'west-distribution',
        to: 'east-distribution',
        capacity: 1.05,
        points: [{ x: 51, y: 55 }, { x: 60, y: 56 }, { x: 70, y: 57 }]
      },
      {
        id: 'wind-to-east',
        from: 'wind-hub',
        to: 'east-distribution',
        capacity: 0.95,
        points: [{ x: 90, y: 56 }, { x: 83, y: 56 }, { x: 76, y: 57 }, { x: 70, y: 57 }]
      },
      {
        id: 'storage-to-east',
        from: 'storage-hub',
        to: 'east-distribution',
        capacity: 1,
        points: [{ x: 74, y: 78 }, { x: 73, y: 70 }, { x: 72, y: 63 }, { x: 70, y: 57 }]
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
