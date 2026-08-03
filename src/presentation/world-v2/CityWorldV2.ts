import city01MapData from '../../data/city01-world-v2/map.json';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { CityWorldV2Runtime } from './CityWorldV2Runtime';
import {
  assertWorldV2MapContract,
  type WorldV2MapContract
} from './WorldContractsV2';

const city01Map = city01MapData as WorldV2MapContract;
assertWorldV2MapContract(city01Map);

/**
 * The only product-facing City-01 world surface.
 *
 * Terrain, roads, legal footprints and facility placement now come from one
 * World V2 map contract. The previous integrated City-01 renderer remains in
 * the repository only as migration reference and is not used by this entry.
 */
export class CityWorldV2 implements WorldRenderSurface {
  private readonly runtime: WorldRenderSurface;

  constructor(
    private readonly host: HTMLElement,
    actions: WorldRenderActions
  ) {
    this.runtime = new CityWorldV2Runtime(host, actions, city01Map);
  }

  mount(): void {
    this.host.dataset.worldArchitecture = 'world-v2';
    this.host.dataset.worldMigrationStage = 'p1-map-runtime';
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
