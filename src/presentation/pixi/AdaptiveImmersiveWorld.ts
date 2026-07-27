import type { CitySceneState } from '../CitySceneTypes';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01MosaicPixiWorld } from './City01MosaicPixiWorld';
import { ImmersivePixiWorld } from './ImmersivePixiWorld';

type RendererKind = 'city01' | 'immersive';

export class AdaptiveImmersiveWorld implements WorldRenderSurface {
  private active?: WorldRenderSurface;
  private activeKind?: RendererKind;
  private state?: CitySceneState;
  private mounted = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: WorldRenderActions
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    if (this.state) this.activate(this.kindFor(this.state));
  }

  destroy(): void {
    this.mounted = false;
    this.active?.destroy();
    this.active = undefined;
    this.activeKind = undefined;
    this.host.replaceChildren();
  }

  setState(next: CitySceneState): void {
    this.state = next;
    const kind = this.kindFor(next);
    if (kind !== this.activeKind) this.activate(kind);
    this.active?.setState(next);
  }

  focusHome(): void {
    this.active?.focusHome();
  }

  zoomBy(factor: number): void {
    this.active?.zoomBy(factor);
  }

  private kindFor(state: CitySceneState): RendererKind {
    return state.levelId === 'city-01' ? 'city01' : 'immersive';
  }

  private activate(kind: RendererKind): void {
    this.active?.destroy();
    this.active = kind === 'city01'
      ? new City01MosaicPixiWorld(this.host, this.actions)
      : new ImmersivePixiWorld(this.host, this.actions);
    this.activeKind = kind;
    if (this.mounted) this.active.mount();
  }
}
