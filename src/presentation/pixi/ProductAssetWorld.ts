import type { CitySceneState } from '../CitySceneMapper';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01ProductPixiWorld } from './City01ProductPixiWorld';
import { ImmersivePixiWorld } from './ImmersivePixiWorld';

type ProductRendererMode = 'city01-product' | 'immersive';

export class ProductAssetWorld implements WorldRenderSurface {
  private renderer?: WorldRenderSurface;
  private mode?: ProductRendererMode;
  private mounted = false;
  private lastState?: CitySceneState;

  constructor(
    private readonly container: HTMLElement,
    private readonly actions: WorldRenderActions
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.ensureRenderer(this.lastState?.levelId === 'city-01' ? 'city01-product' : 'immersive');
    this.renderer?.mount();
    if (this.lastState) this.renderer?.setState(this.lastState);
  }

  destroy(): void {
    this.mounted = false;
    this.renderer?.destroy();
    this.renderer = undefined;
    this.mode = undefined;
    this.lastState = undefined;
    this.container.replaceChildren();
  }

  setState(next: CitySceneState): void {
    const renderedState = next.levelId === 'city-01' ? this.city01State(next) : next;
    this.lastState = renderedState;
    const nextMode: ProductRendererMode = next.levelId === 'city-01'
      ? 'city01-product'
      : 'immersive';
    const changed = this.ensureRenderer(nextMode);
    if (changed && this.mounted) this.renderer?.mount();
    this.renderer?.setState(renderedState);
  }

  focusHome(): void {
    this.renderer?.focusHome();
  }

  zoomBy(factor: number): void {
    this.renderer?.zoomBy(factor);
  }

  private city01State(next: CitySceneState): CitySceneState {
    const diagnostics = next.presentationMode === 'grid';
    return {
      ...next,
      focus: { x: 53, z: 52, elevation: 0 },
      camera: {
        ...next.camera,
        startZoom: diagnostics ? 0.84 : 0.88,
        minZoom: Math.min(next.camera.minZoom, 0.62),
        startOffsetX: 8,
        startOffsetY: 18,
        panLimitX: Math.max(next.camera.panLimitX ?? 170, 230),
        panLimitY: Math.max(next.camera.panLimitY ?? 120, 180)
      },
      districtPrefabs: next.districtPrefabs?.map((district) => ({
        ...district,
        scale: district.scale * 1.18
      })),
      facilities: next.facilities.map((facility) => ({
        ...facility,
        scale: facility.scale * 1.12
      })),
      roads: [],
      networkEdges: diagnostics
        ? next.networkEdges?.filter((edge) =>
          edge.status === 'offline'
          || edge.status === 'overload'
          || edge.loadRatio > 0.025
        )
        : []
    };
  }

  private ensureRenderer(nextMode: ProductRendererMode): boolean {
    if (this.renderer && this.mode === nextMode) return false;
    this.renderer?.destroy();
    this.container.replaceChildren();
    this.mode = nextMode;
    this.renderer = nextMode === 'city01-product'
      ? new City01ProductPixiWorld(this.container, this.actions)
      : new ImmersivePixiWorld(this.container, this.actions);
    return true;
  }
}
