import type { CityPresentationMode } from '../CitySceneTypes';

export type ResolvedCityPresentationMode = 'game' | 'grid' | 'showcase';

export const resolveCityPresentationMode = (
  mode: CityPresentationMode | undefined
): ResolvedCityPresentationMode => {
  if (mode === 'grid') return 'grid';
  if (mode === 'showcase' || mode === 'city') return 'showcase';
  return 'game';
};

export const shouldDrawDiagnosticStructure = (
  mode: ResolvedCityPresentationMode
): boolean => mode === 'grid';

export const shouldDrawPlotGrounds = (
  mode: ResolvedCityPresentationMode,
  hasPlacement: boolean
): boolean => mode === 'grid' || hasPlacement;

export const shouldDrawAvailablePlotHints = (
  mode: ResolvedCityPresentationMode,
  hasPlacement: boolean
): boolean => mode === 'game' && !hasPlacement;

export const shouldDrawEnergyNetwork = (
  mode: ResolvedCityPresentationMode
): boolean => mode !== 'showcase';
