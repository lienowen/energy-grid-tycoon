export type DistrictPrefabKind =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'public'
  | 'old_town';

export type EnvironmentPrefabKind = 'water' | 'coast' | 'forest' | 'ridge' | 'park';

export type EnergyNetworkNodeKind =
  | 'generation'
  | 'storage'
  | 'substation'
  | 'distribution'
  | 'district';

export type TerrainTileKind = 'water' | 'grass';
export type TileWorldEdge = 'north' | 'east' | 'south' | 'west';
export type TileWorldRoadLaneWidth = 2 | 4 | 6;

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

export interface AuthoredPlotAnchorConfig extends LayoutPoint {
  plotId: string;
  scale?: number;
}

export interface TileWorldRectConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileWorldGridPointConfig {
  x: number;
  y: number;
}

export interface TileWorldRoadAnchorConfig extends TileWorldGridPointConfig {
  id: string;
  edge: TileWorldEdge;
  laneWidth: TileWorldRoadLaneWidth;
}

export interface TileWorldRoadPathConfig {
  id: string;
  laneWidth: TileWorldRoadLaneWidth;
  points: TileWorldGridPointConfig[];
}

/**
 * Logical tile-world input. The mapper owns grid construction and autotiling;
 * renderers may only consume the resulting TileWorldSceneState.
 *
 * Water profiles are open boundaries, not a closed island polygon:
 * - westWaterColumnsByRow: water cell count from the west edge for each row.
 * - southWaterRowsByColumn: water cell count from the south edge for each column.
 */
export interface TileWorldConfig {
  columns: number;
  rows: number;
  cellSize: number;
  originX: number;
  originY: number;
  defaultTerrain: TerrainTileKind;
  westWaterColumnsByRow?: number[];
  southWaterRowsByColumn?: number[];
  unlockedRegions: TileWorldRectConfig[];
  roadAnchors: TileWorldRoadAnchorConfig[];
  roadPaths: TileWorldRoadPathConfig[];
}

export interface EnergyNetworkNodeConfig extends LayoutPoint {
  id: string;
  label: string;
  kind: EnergyNetworkNodeKind;
  districtId?: string;
  plotIds?: string[];
  facilityConfigIds?: string[];
  alwaysOperational?: boolean;
  capacity: number;
}

export interface EnergyNetworkEdgeConfig {
  id: string;
  from: string;
  to: string;
  capacity: number;
  points?: LayoutPoint[];
}

export interface EnergyNetworkLayoutConfig {
  nodes: EnergyNetworkNodeConfig[];
  edges: EnergyNetworkEdgeConfig[];
}

export interface LevelSceneCameraConfig {
  startZoom: number;
  minZoom: number;
  maxZoom: number;
  startOffsetX: number;
  startOffsetY: number;
  panLimitX?: number;
  panLimitY?: number;
}

export interface LevelSceneLayout {
  levelId: string;
  mode: 'authored';
  focus: LayoutPoint;
  camera: LevelSceneCameraConfig;
  worldGrid?: TileWorldConfig;
  districts: DistrictPrefabConfig[];
  roads: AuthoredRoadConfig[];
  environment: EnvironmentPrefabConfig[];
  plotAnchors?: AuthoredPlotAnchorConfig[];
  energyNetwork: EnergyNetworkLayoutConfig;
}
