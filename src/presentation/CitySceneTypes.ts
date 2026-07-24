import type { BuildingConfig } from '../buildings/BuildingBase';
import type { CityPlotZone } from '../core/CityMapConfig';
import type {
  DistrictPrefabKind,
  EnergyNetworkNodeKind,
  EnvironmentPrefabKind
} from './layout/LevelSceneLayout';

export interface HologramCameraConfig {
  startZoom: number;
  minZoom: number;
  maxZoom: number;
  startOffsetX: number;
  startOffsetY: number;
  panLimitX?: number;
  panLimitY?: number;
}

export interface ScenePoint {
  x: number;
  z: number;
  elevation: number;
}

export interface DistrictSceneState extends ScenePoint {
  id: CityPlotZone;
  label: string;
  radiusX: number;
  radiusZ: number;
  powerRatio: number;
  demandIntensity?: number;
  populationShare?: number;
}

export type DistrictPrefabStatus = 'normal' | 'warning' | 'blackout' | 'offline';

export interface DistrictPrefabSceneState extends ScenePoint {
  id: string;
  label: string;
  kind: DistrictPrefabKind;
  width: number;
  depth: number;
  scale: number;
  buildingCount: number;
  variant: number;
  powerRatio: number;
  status: DistrictPrefabStatus;
}

export interface EnvironmentPrefabSceneState extends ScenePoint {
  id: string;
  kind: EnvironmentPrefabKind;
  width: number;
  depth: number;
  density: number;
  variant: number;
}

export interface FacilitySceneState extends ScenePoint {
  instanceId: string;
  configId: string;
  plotId: string;
  name: string;
  assetId: string;
  category: BuildingConfig['category'];
  enabled: boolean;
  level: number;
  scale: number;
  output: number;
  storageRatio: number;
}

export interface PlotSceneState extends ScenePoint {
  id: string;
  zone: CityPlotZone;
  label: string;
  scale: number;
  locked: boolean;
  occupied: boolean;
  available: boolean;
  blocked: boolean;
  blockedReason?: string;
  facilityId?: string;
}

export interface EnergyLinkSceneState {
  id: string;
  from: ScenePoint;
  to: ScenePoint;
  active: boolean;
  intensity: number;
}

export type EnergyNetworkNodeStatus = 'active' | 'warning' | 'offline' | 'planned';
export type EnergyNetworkEdgeStatus = 'normal' | 'overload' | 'offline' | 'planned';
export type CityPresentationMode = 'city' | 'grid';

export interface EnergyNetworkNodeSceneState extends ScenePoint {
  id: string;
  label: string;
  kind: EnergyNetworkNodeKind;
  status: EnergyNetworkNodeStatus;
  capacity: number;
  loadRatio: number;
  facilityId?: string;
  districtId?: string;
}

export interface EnergyNetworkEdgeSceneState {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  points: ScenePoint[];
  capacity: number;
  loadRatio: number;
  status: EnergyNetworkEdgeStatus;
}

export interface RoadSceneState {
  id: string;
  points: ScenePoint[];
  laneCount: 1 | 2;
  traffic: number;
  powered: boolean;
}

export type AmbientBlockKind = 'residential' | 'industrial' | 'utility' | 'park';

export interface AmbientBlockSceneState extends ScenePoint {
  id: string;
  zone: CityPlotZone;
  kind: AmbientBlockKind;
  width: number;
  depth: number;
  height: number;
  floors: number;
  lightSeed: number;
  powerRatio: number;
}

export interface ExpansionSiteSceneState extends ScenePoint {
  id: string;
  zone: CityPlotZone;
  progress: number;
  scale: number;
  label: string;
}

export type CitizenFeedbackTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface CitizenFeedbackSceneState extends ScenePoint {
  id: string;
  districtId: CityPlotZone;
  message: string;
  tone: CitizenFeedbackTone;
  priority: number;
  phase: number;
}

export interface CityGrowthSceneState {
  stage: 1 | 2 | 3 | 4;
  progress: number;
  label: string;
}

export interface CityScenePlacementState {
  buildingId: string;
  buildingName: string;
  assetId: string;
  validPlotIds: string[];
}

export interface CitySceneState {
  levelId: string;
  cityName: string;
  theme: 'residential' | 'industrial' | 'green';
  accent: string;
  backgroundAssetId?: string;
  day: number;
  hour: number;
  population: number;
  satisfaction: number;
  pollutionRatio: number;
  supplyRatio: number;
  demandRatio?: number;
  blackoutIntensity: number;
  trafficDensity: number;
  city: ScenePoint;
  focus?: ScenePoint;
  camera: HologramCameraConfig;
  sceneMode?: 'procedural' | 'authored';
  presentationMode?: CityPresentationMode;
  growth?: CityGrowthSceneState;
  districts: DistrictSceneState[];
  districtPrefabs?: DistrictPrefabSceneState[];
  environment?: EnvironmentPrefabSceneState[];
  networkNodes?: EnergyNetworkNodeSceneState[];
  networkEdges?: EnergyNetworkEdgeSceneState[];
  plots: PlotSceneState[];
  facilities: FacilitySceneState[];
  links: EnergyLinkSceneState[];
  roads: RoadSceneState[];
  ambientBlocks: AmbientBlockSceneState[];
  expansionSites?: ExpansionSiteSceneState[];
  citizenFeedback?: CitizenFeedbackSceneState[];
  placement?: CityScenePlacementState;
}
