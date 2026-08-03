import {
  CITY01_GOLDEN_SCENE_CAMERA,
  CITY01_GOLDEN_SCENE_DISTRICTS,
  CITY01_GOLDEN_SCENE_ENVIRONMENT,
  CITY01_GOLDEN_SCENE_FOCUS,
  CITY01_GOLDEN_SCENE_NETWORK_POINTS
} from '../art-v2/City01GoldenScene';
import { city01WorldGridConfig } from './City01WorldGridConfig';
import type { LevelSceneLayout } from './LevelSceneLayout';

const dawnCityLayout: LevelSceneLayout = {
  levelId: 'city-01',
  mode: 'authored',
  focus: CITY01_GOLDEN_SCENE_FOCUS,
  camera: CITY01_GOLDEN_SCENE_CAMERA,
  worldGrid: city01WorldGridConfig,
  districts: CITY01_GOLDEN_SCENE_DISTRICTS,
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
  // Ordinary roads live in worldGrid. This channel remains diagnostic-only.
  roads: [],
  environment: CITY01_GOLDEN_SCENE_ENVIRONMENT,
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
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.mainSubstation,
        alwaysOperational: true,
        capacity: 1.35
      },
      {
        id: 'west-distribution',
        label: '西部配电',
        kind: 'distribution',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.westDistribution,
        alwaysOperational: true,
        capacity: 1.15
      },
      {
        id: 'east-distribution',
        label: '东部配电',
        kind: 'distribution',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.eastDistribution,
        alwaysOperational: true,
        capacity: 1.05
      },
      {
        id: 'residential-load',
        label: '居住区',
        kind: 'district',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.residentialLoad,
        districtId: 'dawn-residential',
        capacity: 0.9
      },
      {
        id: 'commercial-load',
        label: '商业区',
        kind: 'district',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.commercialLoad,
        districtId: 'dawn-commercial',
        capacity: 1.05
      },
      {
        id: 'industrial-load',
        label: '工业区',
        kind: 'district',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.industrialLoad,
        districtId: 'dawn-industrial',
        capacity: 1.2
      },
      {
        id: 'public-load',
        label: '公共服务区',
        kind: 'district',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.publicLoad,
        districtId: 'dawn-public',
        capacity: 0.85
      },
      {
        id: 'old-town-load',
        label: '东部老城区',
        kind: 'district',
        ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.oldTownLoad,
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
        points: [
          { x: 29, y: 27 },
          { x: 41, y: 35 },
          { x: 52, y: 44 },
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.mainSubstation }
        ]
      },
      {
        id: 'reserve-to-main',
        from: 'reserve-plant',
        to: 'main-substation',
        capacity: 1.2,
        points: [
          { x: 30, y: 74 },
          { x: 42, y: 68 },
          { x: 53, y: 62 },
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.mainSubstation }
        ]
      },
      {
        id: 'main-to-west',
        from: 'main-substation',
        to: 'west-distribution',
        capacity: 1.25,
        points: [
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.mainSubstation },
          { x: 57, y: 57 },
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.westDistribution }
        ]
      },
      {
        id: 'west-to-east',
        from: 'west-distribution',
        to: 'east-distribution',
        capacity: 1.05,
        points: [
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.westDistribution },
          { x: 61, y: 57 },
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.eastDistribution }
        ]
      },
      {
        id: 'wind-to-east',
        from: 'wind-hub',
        to: 'east-distribution',
        capacity: 0.95,
        points: [
          { x: 90, y: 56 },
          { x: 84, y: 56 },
          { x: 77, y: 57 },
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.eastDistribution }
        ]
      },
      {
        id: 'storage-to-east',
        from: 'storage-hub',
        to: 'east-distribution',
        capacity: 1,
        points: [
          { x: 74, y: 78 },
          { x: 74, y: 70 },
          { x: 73, y: 64 },
          { ...CITY01_GOLDEN_SCENE_NETWORK_POINTS.eastDistribution }
        ]
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
