import city01MapData from '../../data/city01-world-v2/map.json';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01IntegratedPixiWorld } from '../pixi/City01IntegratedPixiWorld';
import {
  assertWorldV2MapContract,
  type WorldV2MapContract
} from './WorldContractsV2';

const city01Map = city01MapData as WorldV2MapContract;
assertWorldV2MapContract(city01Map);

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
    this.host.dataset.worldMap = city01Map.id;
    this.host.dataset.worldMapSchema = String(city01Map.schemaVersion);
    this.runtime.mount();
  }

  destroy(): void {
    this.runtime.destroy();
    delete this.host.dataset.worldArchitecture;
    delete this.host.dataset.worldMigrationStage;
    delete this.host.dataset.worldMap;
    delete this.host.dataset.worldMapSchema;
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
