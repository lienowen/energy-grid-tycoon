import type {
  DistrictPrefabSceneState,
  EnergyNetworkEdgeSceneState,
  EnergyNetworkNodeSceneState
} from './CitySceneTypes';

const incidentPriority: Readonly<Record<EnergyNetworkEdgeSceneState['status'], number>> = {
  offline: 3,
  overload: 2,
  planned: 1,
  normal: 0
};

// The default city view protects the player's visual hierarchy; diagnostics are opt-in.
export const shouldRenderNetworkEdge = (
  edge: Pick<EnergyNetworkEdgeSceneState, 'status'>,
  showDiagnostics: boolean
): boolean => showDiagnostics || edge.status === 'overload' || edge.status === 'offline';

export const selectVisibleNetworkEdges = (
  edges: readonly EnergyNetworkEdgeSceneState[],
  showDiagnostics: boolean
): EnergyNetworkEdgeSceneState[] => {
  if (showDiagnostics) return [...edges];
  return edges
    .filter((edge) => shouldRenderNetworkEdge(edge, false))
    .sort((left, right) =>
      incidentPriority[right.status] - incidentPriority[left.status]
      || right.loadRatio - left.loadRatio
    )
    .slice(0, 2);
};

export const shouldRenderNetworkNodeAsset = (
  node: Pick<EnergyNetworkNodeSceneState, 'kind'>,
  showDiagnostics: boolean
): boolean => node.kind === 'substation' || showDiagnostics;

export const shouldRenderNetworkNodeDiagnostics = (
  _node: Pick<EnergyNetworkNodeSceneState, 'status'>,
  showDiagnostics: boolean
): boolean => showDiagnostics;

export const shouldRenderDistrictLabel = (
  district: Pick<DistrictPrefabSceneState, 'status'>,
  showDiagnostics: boolean
): boolean => showDiagnostics || district.status !== 'normal';
