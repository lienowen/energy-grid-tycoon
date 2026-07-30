import { describe, expect, it } from 'vitest';
import {
  resolveCityPresentationMode,
  shouldDrawAvailablePlotHints,
  shouldDrawDiagnosticStructure,
  shouldDrawEnergyNetwork,
  shouldDrawPlotGrounds
} from './City01PresentationPolicy';

describe('City01PresentationPolicy', () => {
  it('uses game as the default player-facing mode', () => {
    expect(resolveCityPresentationMode(undefined)).toBe('game');
    expect(resolveCityPresentationMode('game')).toBe('game');
    expect(resolveCityPresentationMode('city')).toBe('game');
  });

  it('keeps grid diagnostic-only and showcase illustration-focused', () => {
    expect(shouldDrawDiagnosticStructure(resolveCityPresentationMode('grid'))).toBe(true);
    expect(shouldDrawDiagnosticStructure(resolveCityPresentationMode('game'))).toBe(false);
    expect(shouldDrawEnergyNetwork(resolveCityPresentationMode('showcase'))).toBe(false);
    expect(shouldDrawEnergyNetwork(resolveCityPresentationMode('game'))).toBe(true);
  });

  it('shows plot grounds only for diagnostics or active placement', () => {
    expect(shouldDrawPlotGrounds('game', false)).toBe(false);
    expect(shouldDrawPlotGrounds('game', true)).toBe(true);
    expect(shouldDrawPlotGrounds('grid', false)).toBe(true);
  });

  it('shows lightweight plot hints only in idle game mode', () => {
    expect(shouldDrawAvailablePlotHints('game', false)).toBe(true);
    expect(shouldDrawAvailablePlotHints('game', true)).toBe(false);
    expect(shouldDrawAvailablePlotHints('grid', false)).toBe(false);
    expect(shouldDrawAvailablePlotHints('showcase', false)).toBe(false);
  });
});
