import { describe, expect, it } from 'vitest';
import {
  selectVisibleNetworkEdges,
  shouldRenderDistrictLabel,
  shouldRenderNetworkEdge,
  shouldRenderNetworkNodeAsset,
  shouldRenderNetworkNodeDiagnostics
} from './CommercialPresentationPolicy';
import type { EnergyNetworkEdgeSceneState } from './CitySceneTypes';

const edge = (
  id: string,
  status: EnergyNetworkEdgeSceneState['status'],
  loadRatio: number
): EnergyNetworkEdgeSceneState => ({
  id,
  status,
  loadRatio,
  fromNodeId: 'a',
  toNodeId: 'b',
  capacity: 1,
  points: []
});

describe('CommercialPresentationPolicy', () => {
  it('keeps normal topology out of the default city view', () => {
    expect(shouldRenderNetworkEdge({ status: 'normal' }, false)).toBe(false);
    expect(shouldRenderNetworkEdge({ status: 'planned' }, false)).toBe(false);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'active' }, false)).toBe(false);
  });

  it('caps default incident paths to the two highest-priority faults', () => {
    const visible = selectVisibleNetworkEdges([
      edge('normal', 'normal', 0.8),
      edge('overload-low', 'overload', 1.1),
      edge('offline', 'offline', 0),
      edge('overload-high', 'overload', 1.4)
    ], false);
    expect(visible.map((item) => item.id)).toEqual(['offline', 'overload-high']);
  });

  it('keeps the main substation as a landmark without engineering markers', () => {
    expect(shouldRenderNetworkNodeAsset({ kind: 'substation' }, false)).toBe(true);
    expect(shouldRenderNetworkNodeAsset({ kind: 'distribution' }, false)).toBe(false);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'offline' }, false)).toBe(false);
  });

  it('only labels healthy districts in the explicit grid view', () => {
    expect(shouldRenderDistrictLabel({ status: 'normal' }, false)).toBe(false);
    expect(shouldRenderDistrictLabel({ status: 'blackout' }, false)).toBe(true);
    expect(shouldRenderDistrictLabel({ status: 'normal' }, true)).toBe(true);
  });

  it('shows the complete topology in grid view', () => {
    const all = [edge('normal', 'normal', 0.8), edge('planned', 'planned', 0)];
    expect(selectVisibleNetworkEdges(all, true)).toEqual(all);
    expect(shouldRenderNetworkNodeAsset({ kind: 'distribution' }, true)).toBe(true);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'planned' }, true)).toBe(true);
  });
});
