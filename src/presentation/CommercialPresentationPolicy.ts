import type {
  DistrictPrefabSceneState,
  EnergyNetworkEdgeSceneState,
  EnergyNetworkNodeSceneState
} from './CitySceneTypes';

export const shouldRenderNetworkEdge = (
  edge: Pick<EnergyNetworkEdgeSceneState, 'status'>,
  showDiagnostics: boolean
): boolean => showDiagnostics || edge.status === 'overload' || edge.status === 'offline';

export const shouldRenderNetworkNodeAsset = (
  node: Pick<EnergyNetworkNodeSceneState, 'kind' | 'status'>,
  showDiagnostics: boolean
): boolean => node.kind === 'substation'
  || showDiagnostics
  || node.status === 'warning'
  || node.status === 'offline';

export const shouldRenderNetworkNodeDiagnostics = (
  node: Pick<EnergyNetworkNodeSceneState, 'status'>,
  showDiagnostics: boolean
): boolean => showDiagnostics || node.status === 'warning' || node.status === 'offline';

export const shouldRenderDistrictLabel = (
  district: Pick<DistrictPrefabSceneState, 'status'>,
  showDiagnostics: boolean
): boolean => showDiagnostics || district.status !== 'normal';
