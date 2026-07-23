export type DistrictPrefabKind =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'public'
  | 'old_town';

export type EnvironmentPrefabKind = 'water' | 'coast' | 'forest' | 'ridge' | 'park';

export interface LayoutPoint {
  x: number;
  y: number;
  elevation?: number;
}

export interface DistrictPrefabConfig extends LayoutPoint {
  id: string;
  label: string;
  kind: DistrictPrefabKind;
  width: number;
  depth: number;
  scale?: number;
  buildingCount?: number;
  priority: number;
  variant?: number;
}

export interface EnvironmentPrefabConfig extends LayoutPoint {
  id: string;
  kind: EnvironmentPrefabKind;
  width: number;
  depth: number;
  density?: number;
  variant?: number;
}

export interface AuthoredRoadConfig {
  id: string;
  points: LayoutPoint[];
  laneCount: 1 | 2;
}

export interface LevelSceneCameraConfig {
  startZoom: number;
  minZoom: number;
  maxZoom: number;
  startOffsetX: number;
  startOffsetY: number;
}

export interface LevelSceneLayout {
  levelId: string;
  mode: 'authored';
  camera: LevelSceneCameraConfig;
  districts: DistrictPrefabConfig[];
  roads: AuthoredRoadConfig[];
  environment: EnvironmentPrefabConfig[];
}
