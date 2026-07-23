import type { CitySceneState } from '../../presentation/CitySceneMapper';

export interface WorldRenderSurface {
  mount(): void;
  destroy(): void;
  setState(next: CitySceneState): void;
  focusHome(): void;
  zoomBy(factor: number): void;
}
