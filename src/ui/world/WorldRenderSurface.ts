import type { CitySceneState } from '../../presentation/CitySceneMapper';

export interface WorldRenderActions {
  onPlotClick: (plotId: string) => void;
  onFacilityClick: (instanceId: string) => void;
}

export interface WorldRenderSurface {
  mount(): void;
  destroy(): void;
  setState(next: CitySceneState): void;
  focusHome(): void;
  zoomBy(factor: number): void;
}
