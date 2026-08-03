import type {
  DistrictPrefabConfig,
  EnvironmentPrefabConfig,
  LevelSceneCameraConfig,
  LayoutPoint
} from '../layout/LevelSceneLayout';

export const CITY01_GOLDEN_SCENE_REVISION = 'city01-golden-scene-1';

export const CITY01_GOLDEN_SCENE_FOCUS: LayoutPoint = {
  x: 56,
  y: 53,
  elevation: 0
};

export const CITY01_GOLDEN_SCENE_CAMERA: LevelSceneCameraConfig = {
  startZoom: 1.34,
  minZoom: 0.56,
  maxZoom: 2.5,
  startOffsetX: 8,
  startOffsetY: 30,
  panLimitX: 500,
  panLimitY: 340
};

/**
 * The first product-facing City-01 composition.
 *
 * Districts form a readable crescent around the civic/grid core instead of a
 * single overlapping collage. The public district is deliberately separated
 * from the main substation so both silhouettes remain readable at home zoom.
 */
export const CITY01_GOLDEN_SCENE_DISTRICTS: DistrictPrefabConfig[] = [
  {
    id: 'dawn-residential',
    label: '居住区',
    kind: 'residential',
    x: 74,
    y: 36,
    width: 23,
    depth: 15,
    scale: 0.96,
    buildingCount: 7,
    priority: 1,
    variant: 11
  },
  {
    id: 'dawn-commercial',
    label: '商业区',
    kind: 'commercial',
    x: 46,
    y: 43,
    width: 23,
    depth: 16,
    scale: 1,
    buildingCount: 6,
    priority: 2,
    variant: 23
  },
  {
    id: 'dawn-industrial',
    label: '工业区',
    kind: 'industrial',
    x: 73,
    y: 69,
    width: 23,
    depth: 16,
    scale: 0.96,
    buildingCount: 5,
    priority: 3,
    variant: 37
  },
  {
    id: 'dawn-public',
    label: '公共服务区',
    kind: 'public',
    x: 53,
    y: 48,
    width: 18,
    depth: 12,
    scale: 0.94,
    buildingCount: 4,
    priority: 0,
    variant: 41
  },
  {
    id: 'dawn-old-town',
    label: '东部老城区',
    kind: 'old_town',
    x: 39,
    y: 64,
    width: 22,
    depth: 16,
    scale: 0.98,
    buildingCount: 6,
    priority: 5,
    variant: 59
  }
];

export const CITY01_GOLDEN_SCENE_ENVIRONMENT: EnvironmentPrefabConfig[] = [
  { id: 'dawn-west-water', kind: 'water', x: 5, y: 51, width: 25, depth: 94, density: 0.7, variant: 3 },
  { id: 'dawn-south-coast', kind: 'coast', x: 51, y: 93, width: 100, depth: 17, density: 0.8, variant: 7 },
  { id: 'dawn-north-ridge', kind: 'ridge', x: 61, y: 4, width: 86, depth: 17, density: 0.9, variant: 13 },
  { id: 'dawn-north-forest', kind: 'forest', x: 36, y: 10, width: 46, depth: 16, density: 0.82, variant: 17 },
  { id: 'dawn-east-forest', kind: 'forest', x: 99, y: 46, width: 16, depth: 72, density: 0.88, variant: 29 },
  { id: 'dawn-central-park', kind: 'park', x: 55, y: 49, width: 18, depth: 10, density: 0.78, variant: 31 }
];

export const CITY01_GOLDEN_SCENE_NETWORK_POINTS = {
  mainSubstation: { x: 63, y: 58, elevation: 0.16 },
  westDistribution: { x: 51, y: 56, elevation: 0.1 },
  eastDistribution: { x: 71, y: 58, elevation: 0.1 },
  residentialLoad: { x: 74, y: 36, elevation: 0.1 },
  commercialLoad: { x: 46, y: 43, elevation: 0.1 },
  industrialLoad: { x: 73, y: 69, elevation: 0.1 },
  publicLoad: { x: 53, y: 48, elevation: 0.1 },
  oldTownLoad: { x: 39, y: 64, elevation: 0.1 }
} satisfies Record<string, LayoutPoint>;
