import type { CitySceneState } from '../CitySceneTypes';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01IntegratedPixiWorld } from './City01IntegratedPixiWorld';

/**
 * City-01 uses authored product road tiles for the visible street network.
 * Simulation roads stay in CitySceneState for traffic and rules, but drawing
 * them again as vector strokes creates the rejected black pipe overlay.
 */
export class City01RoadTileWorld implements WorldRenderSurface {
  private readonly renderer: City01IntegratedPixiWorld;

  constructor(host: HTMLElement, actions: WorldRenderActions) {
    this.renderer = new City01IntegratedPixiWorld(host, actions);
  }

  mount(): void {
    this.renderer.mount();
  }

  destroy(): void {
    this.renderer.destroy();
  }

  setState(next: CitySceneState): void {
    this.renderer.setState({ ...next, roads: [] });
  }

  focusHome(): void {
    this.renderer.focusHome();
  }

  zoomBy(factor: number): void {
    this.renderer.zoomBy(factor);
  }
}
