import { describe, expect, it } from 'vitest';
import {
  shouldRenderDistrictLabel,
  shouldRenderNetworkEdge,
  shouldRenderNetworkNodeAsset,
  shouldRenderNetworkNodeDiagnostics
} from './CommercialPresentationPolicy';

describe('CommercialPresentationPolicy', () => {
  it('keeps normal topology out of the default city view', () => {
    expect(shouldRenderNetworkEdge({ status: 'normal' }, false)).toBe(false);
    expect(shouldRenderNetworkEdge({ status: 'planned' }, false)).toBe(false);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'active' }, false)).toBe(false);
  });

  it('keeps faults visible without opening the grid view', () => {
    expect(shouldRenderNetworkEdge({ status: 'overload' }, false)).toBe(true);
    expect(shouldRenderNetworkEdge({ status: 'offline' }, false)).toBe(true);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'warning' }, false)).toBe(true);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'offline' }, false)).toBe(true);
  });

  it('keeps the main substation as a city landmark while hiding routine diagnostics', () => {
    expect(shouldRenderNetworkNodeAsset({ kind: 'substation', status: 'active' }, false)).toBe(true);
    expect(shouldRenderNetworkNodeAsset({ kind: 'distribution', status: 'active' }, false)).toBe(false);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'active' }, false)).toBe(false);
  });

  it('only labels healthy districts in the explicit grid view', () => {
    expect(shouldRenderDistrictLabel({ status: 'normal' }, false)).toBe(false);
    expect(shouldRenderDistrictLabel({ status: 'blackout' }, false)).toBe(true);
    expect(shouldRenderDistrictLabel({ status: 'normal' }, true)).toBe(true);
  });

  it('shows the complete topology in grid view', () => {
    expect(shouldRenderNetworkEdge({ status: 'normal' }, true)).toBe(true);
    expect(shouldRenderNetworkNodeAsset({ kind: 'distribution', status: 'active' }, true)).toBe(true);
    expect(shouldRenderNetworkNodeDiagnostics({ status: 'planned' }, true)).toBe(true);
  });
});
