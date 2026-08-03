import { City01IntegratedPixiWorld } from '../pixi/City01IntegratedPixiWorld';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';

/**
 * The only product-facing City-01 world surface.
 *
 * During P0 this class deliberately adapts the proven Pixi runtime so the
 * simulation, placement and save flows remain usable while terrain, roads,
 * districts and facilities are replaced behind this boundary. No UI caller
 * should import a legacy City-01 renderer directly after this point.
 */
export class CityWorldV2 implements WorldRenderSurface {
  private readonly runtime: WorldRenderSurface;

  constructor(
    private readonly host: HTMLElement,
    actions: WorldRenderActions
  ) {
    this.runtime = new City01IntegratedPixiWorld(host, actions);
  }

  mount(): void {
    this.host.dataset.worldArchitecture = 'world-v2';
    this.host.dataset.worldMigrationStage = 'p0-runtime-boundary';
    this.runtime.mount();
  }

  destroy(): void {
    this.runtime.destroy();
    delete this.host.dataset.worldArchitecture;
    delete this.host.dataset.worldMigrationStage;
  }

  setState(next: Parameters<WorldRenderSurface['setState']>[0]): void {
    this.runtime.setState(next);
  }

  focusHome(): void {
    this.runtime.focusHome();
  }

  zoomBy(factor: number): void {
    this.runtime.zoomBy(factor);
  }
}
