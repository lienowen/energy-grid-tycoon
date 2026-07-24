import type { LevelSceneLayout } from './LevelSceneLayout';

const dawnCityLayout: LevelSceneLayout = {
  levelId: 'city-01',
  mode: 'authored',
  focus: { x: 53, y: 47, elevation: 0 },
  camera: {
    startZoom: 1.43,
    minZoom: 0.86,
    maxZoom: 2.05,
    startOffsetX: 8,
    startOffsetY: -14,
    panLimitX: 170,
    panLimitY: 120
  },
  districts: [
    {
      id: 'dawn-residential',
      label: '居住区',
      kind: 'residential',
      x: 49,
      y: 25,
      width: 22,
      depth: 15,
      scale: 0.88,
      buildingCount: 7,
      priority: 1,
      variant: 11
    },
    {
      id: 'dawn-commercial',
      label: '商业区',
      kind: 'commercial',
      x: 40,
      y: 54,
      width: 23,
      depth: 17,
      scale: 0.9,
      buildingCount: 6,
      priority: 2,
      variant: 23
    },
    {
      id: 'dawn-industrial',
      label: '工业区',
      kind: 'industrial',
      x: 70,
      y: 49,
      width: 23,
      depth: 17,
      scale: 0.9,
      buildingCount: 5,
      priority: 3,
      variant: 37
    },
    {
      id: 'dawn-public',
      label: '公共服务区',
      kind: 'public',
      x: 54,
      y: 72,
      width: 20,
      depth: 14,
      scale: 0.88,
      buildingCount: 4,
      priority: 0,
      variant: 41
    },
    {
      id: 'dawn-old-town',
      label: '东部老城区',
      kind: 'old_town',
      x: 84,
      y: 69,
      width: 20,
      depth: 15,
      scale: 0.9,
      buildingCount: 6,
      priority: 5,
      variant: 59
    }
  ],
  plotAnchors: [
    { plotId: 'sunrise-neighborhood', x: 10, y: 23, elevation: 0.2, scale: 0.88 },
    { plotId: 'south-outskirts', x: 22, y: 34, elevation: 0.2, scale: 0.88 },
    { plotId: 'north-outskirts', x: 34, y: 13, elevation: 0.2, scale: 0.9 },
    { plotId: 'east-coast', x: 82, y: 16, elevation: 0.45, scale: 1.02 },
    { plotId: 'west-industry', x: 17, y: 72, elevation: 0.15, scale: 1 },
    { plotId: 'south-neighborhood', x: 36, y: 78, elevation: 0.12, scale: 0.94 },
    { plotId: 'central-utility', x: 80, y: 32, elevation: 0.2, scale: 0.96 },
    { plotId: 'east-industry', x: 91, y: 47, elevation: 0.12, scale: 1.08 }
  ],
  roads: [
    {
      id: 'dawn-central-boulevard',
      laneCount: 2,
      points: [
        { x: 26, y: 43 },
        { x: 35, y: 45 },
        { x: 47, y: 45 },
        { x: 59, y: 44 },
        { x: 72, y: 45 },
        { x: 88, y: 51 }
      ]
    },
    {
      id: 'dawn-south-boulevard',
      laneCount: 2,
      points: [
        { x: 20, y: 68 },
        { x: 33, y: 65 },
        { x: 46, y: 63 },
        { x: 59, y: 64 },
        { x: 73, y: 66 },
        { x: 88, y: 65 }
      ]
    },
    {
      id: 'dawn-residential-avenue',
      laneCount: 1,
      points: [
        { x: 29, y: 43 },
        { x: 34, y: 35 },
        { x: 42, y: 28 },
        { x: 55, y: 25 },
        { x: 67, y: 28 },
        { x: 78, y: 33 }
      ]
    },
    {
      id: 'dawn-civic-link',
      laneCount: 1,
      points: [
        { x: 42, y: 52 },
        { x: 46, y: 59 },
        { x: 52, y: 66 },
        { x: 58, y: 72 }
      ]
    },
    {
      id: 'dawn-east-link',
      laneCount: 1,
      points: [
        { x: 70, y: 31 },
        { x: 69, y: 40 },
        { x: 69, y: 49 },
        { x: 77, y: 57 },
        { x: 85, y: 65 }
      ]
    }
  ],
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
        x: 21,
        y: 27,
        elevation: 0.35,
        plotIds: ['sunrise-neighborhood', 'south-outskirts'],
        facilityConfigIds: ['solar_basic'],
        capacity: 0.8
      },
      {
        id: 'wind-hub',
        label: '风力发电场',
        kind: 'generation',
        x: 76,
        y: 14,
        elevation: 0.55,
        plotIds: ['east-coast'],
        facilityConfigIds: ['wind_basic', 'wind_offshore'],
        capacity: 1.05
      },
      {
        id: 'reserve-plant',
        label: '应急电站',
        kind: 'generation',
        x: 18,
        y: 70,
        elevation: 0.25,
        plotIds: ['west-industry'],
        facilityConfigIds: ['gas_basic'],
        capacity: 1.2
      },
      {
        id: 'storage-hub',
        label: '城市储能站',
        kind: 'storage',
        x: 80,
        y: 30,
        elevation: 0.3,
        plotIds: ['central-utility'],
        facilityConfigIds: ['battery_basic', 'battery_utility'],
        capacity: 1.1
      },
      {
        id: 'main-substation',
        label: '主变电站',
        kind: 'substation',
        x: 43,
        y: 48,
        elevation: 0.15,
        alwaysOperational: true,
        capacity: 1.35
      },
      {
        id: 'west-distribution',
        label: '西部配电',
        kind: 'distribution',
        x: 57,
        y: 48,
        elevation: 0.12,
        alwaysOperational: true,
        capacity: 1.15
      },
      {
        id: 'east-distribution',
        label: '东部配电',
        kind: 'distribution',
        x: 71,
        y: 50,
        elevation: 0.12,
        alwaysOperational: true,
        capacity: 1.05
      },
      {
        id: 'residential-load',
        label: '居住区',
        kind: 'district',
        x: 49,
        y: 25,
        elevation: 0.1,
        districtId: 'dawn-residential',
        capacity: 0.9
      },
      {
        id: 'commercial-load',
        label: '商业区',
        kind: 'district',
        x: 40,
        y: 54,
        elevation: 0.1,
        districtId: 'dawn-commercial',
        capacity: 1.05
      },
      {
        id: 'industrial-load',
        label: '工业区',
        kind: 'district',
        x: 70,
        y: 49,
        elevation: 0.1,
        districtId: 'dawn-industrial',
        capacity: 1.2
      },
      {
        id: 'public-load',
        label: '公共服务区',
        kind: 'district',
        x: 54,
        y: 72,
        elevation: 0.1,
        districtId: 'dawn-public',
        capacity: 0.85
      },
      {
        id: 'old-town-load',
        label: '东部老城区',
        kind: 'district',
        x: 84,
        y: 69,
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
        points: [{ x: 17, y: 29 }, { x: 26, y: 35 }, { x: 35, y: 42 }, { x: 43, y: 48 }]
      },
      {
        id: 'reserve-to-main',
        from: 'reserve-plant',
        to: 'main-substation',
        capacity: 1.2,
        points: [{ x: 17, y: 72 }, { x: 25, y: 63 }, { x: 34, y: 55 }, { x: 43, y: 48 }]
      },
      {
        id: 'main-to-west',
        from: 'main-substation',
        to: 'west-distribution',
        capacity: 1.25,
        points: [{ x: 43, y: 48 }, { x: 50, y: 47 }, { x: 57, y: 48 }]
      },
      {
        id: 'west-to-east',
        from: 'west-distribution',
        to: 'east-distribution',
        capacity: 1.05,
        points: [{ x: 57, y: 48 }, { x: 64, y: 47 }, { x: 71, y: 50 }]
      },
      {
        id: 'wind-to-east',
        from: 'wind-hub',
        to: 'east-distribution',
        capacity: 0.95,
        points: [{ x: 76, y: 14 }, { x: 75, y: 25 }, { x: 72, y: 35 }, { x: 70, y: 45 }]
      },
      {
        id: 'storage-to-east',
        from: 'storage-hub',
        to: 'east-distribution',
        capacity: 1.0,
        points: [{ x: 80, y: 30 }, { x: 76, y: 36 }, { x: 70, y: 45 }]
      },
      { id: 'west-to-residential', from: 'west-distribution', to: 'residential-load', capacity: 0.92 },
      { id: 'west-to-commercial', from: 'west-distribution', to: 'commercial-load', capacity: 1.0 },
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
