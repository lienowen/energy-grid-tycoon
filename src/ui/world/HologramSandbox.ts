import { CityWorldV2 } from '../../presentation/world-v2/CityWorldV2';
import type { WorldRenderActions, WorldRenderSurface } from './WorldRenderSurface';

export type HologramSandboxActions = WorldRenderActions;
export type WorldRendererMode = 'world-v2';

/**
 * Product runtime now has one world-rendering path. Legacy renderers remain in
 * the repository only as migration references until World V2 replaces their
 * terrain, district and facility implementations.
 */
export class HologramSandbox implements WorldRenderSurface {
  private readonly renderer: WorldRenderSurface;

  constructor(container: HTMLElement, actions: WorldRenderActions) {
    this.renderer = new CityWorldV2(container, actions);
  }

  mount(): void {
    this.renderer.mount();
  }

  destroy(): void {
    this.renderer.destroy();
  }

  setState(next: Parameters<WorldRenderSurface['setState']>[0]): void {
    this.renderer.setState(next);
  }

  focusHome(): void {
    this.renderer.focusHome();
  }

  zoomBy(factor: number): void {
    this.renderer.zoomBy(factor);
  }
}
