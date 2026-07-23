import type { LevelSceneLayout } from './LevelSceneLayout';

const dawnCityLayout: LevelSceneLayout = {
  levelId: 'city-01',
  mode: 'authored',
  camera: {
    startZoom: 1.34,
    minZoom: 0.9,
    maxZoom: 2.15,
    startOffsetX: -20,
    startOffsetY: 42
  },
  districts: [
    {
      id: 'dawn-residential',
      label: '居住区',
      kind: 'residential',
      x: 48,
      y: 29,
      width: 25,
      depth: 18,
      scale: 1.08,
      buildingCount: 7,
      priority: 1,
      variant: 11
    },
    {
      id: 'dawn-commercial',
      label: '商业区',
      kind: 'commercial',
      x: 42,
      y: 57,
      width: 25,
      depth: 19,
      scale: 1.12,
      buildingCount: 6,
      priority: 2,
      variant: 23
    },
    {
      id: 'dawn-industrial',
      label: '工业区',
      kind: 'industrial',
      x: 68,
      y: 52,
      width: 27,
      depth: 20,
      scale: 1.08,
      buildingCount: 6,
      priority: 3,
      variant: 37
    },
    {
      id: 'dawn-public',
      label: '公共服务区',
      kind: 'public',
      x: 55,
      y: 76,
      width: 23,
      depth: 17,
      scale: 1.02,
      buildingCount: 5,
      priority: 0,
      variant: 41
    },
    {
      id: 'dawn-old-town',
      label: '东部老城区',
      kind: 'old_town',
      x: 83,
      y: 68,
      width: 23,
      depth: 18,
      scale: 1,
      buildingCount: 7,
      priority: 5,
      variant: 59
    }
  ],
  roads: [
    {
      id: 'dawn-west-artery',
      laneCount: 2,
      points: [
        { x: 14, y: 49 },
        { x: 28, y: 48 },
        { x: 42, y: 49 },
        { x: 57, y: 50 },
        { x: 72, y: 51 },
        { x: 88, y: 54 }
      ]
    },
    {
      id: 'dawn-coastal-artery',
      laneCount: 2,
      points: [
        { x: 24, y: 77 },
        { x: 39, y: 70 },
        { x: 55, y: 66 },
        { x: 71, y: 64 },
        { x: 88, y: 66 }
      ]
    },
    {
      id: 'dawn-north-loop',
      laneCount: 1,
      points: [
        { x: 24, y: 31 },
        { x: 37, y: 25 },
        { x: 52, y: 24 },
        { x: 67, y: 27 },
        { x: 80, y: 34 }
      ]
    },
    {
      id: 'dawn-central-link',
      laneCount: 1,
      points: [
        { x: 42, y: 29 },
        { x: 43, y: 43 },
        { x: 44, y: 57 },
        { x: 52, y: 68 },
        { x: 56, y: 77 }
      ]
    },
    {
      id: 'dawn-east-link',
      laneCount: 1,
      points: [
        { x: 73, y: 27 },
        { x: 69, y: 40 },
        { x: 69, y: 53 },
        { x: 77, y: 61 },
        { x: 84, y: 69 }
      ]
    },
    {
      id: 'dawn-public-link',
      laneCount: 1,
      points: [
        { x: 28, y: 48 },
        { x: 34, y: 58 },
        { x: 42, y: 68 },
        { x: 55, y: 76 }
      ]
    }
  ],
  environment: [
    { id: 'dawn-west-water', kind: 'water', x: 7, y: 52, width: 27, depth: 90, density: 0.7, variant: 3 },
    { id: 'dawn-south-coast', kind: 'coast', x: 49, y: 94, width: 94, depth: 17, density: 0.8, variant: 7 },
    { id: 'dawn-north-ridge', kind: 'ridge', x: 66, y: 7, width: 73, depth: 22, density: 0.9, variant: 13 },
    { id: 'dawn-north-forest', kind: 'forest', x: 35, y: 12, width: 48, depth: 22, density: 0.85, variant: 17 },
    { id: 'dawn-east-forest', kind: 'forest', x: 95, y: 43, width: 18, depth: 66, density: 0.9, variant: 29 },
    { id: 'dawn-central-park', kind: 'park', x: 57, y: 43, width: 18, depth: 12, density: 0.65, variant: 31 }
  ]
};

const layouts = new Map<string, LevelSceneLayout>([[dawnCityLayout.levelId, dawnCityLayout]]);

export class LevelSceneLayoutRegistry {
  static resolve(levelId: string): LevelSceneLayout | undefined {
    return layouts.get(levelId);
  }
}
