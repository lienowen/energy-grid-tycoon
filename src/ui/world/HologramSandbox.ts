import { ImmersivePixiWorld } from '../../presentation/pixi/ImmersivePixiWorld';
import { PixiGameWorld } from '../../presentation/pixi/PixiGameWorld';
import { HologramSandbox as LegacyHologramSandbox } from './LegacyHologramSandbox';
import type { WorldRenderActions, WorldRenderSurface } from './WorldRenderSurface';

export type HologramSandboxActions = WorldRenderActions;
export type WorldRendererMode = 'legacy' | 'pixi' | 'immersive';

const STORAGE_KEY = 'energy-grid-tycoon.renderer';

const resolveMode = (): WorldRendererMode => {
  const query = new URLSearchParams(window.location.search).get('renderer');
  if (query === 'immersive' || query === 'pixi' || query === 'legacy') {
    try {
      window.localStorage.setItem(STORAGE_KEY, query);
    } catch {
      // Query selection still works when storage is unavailable.
    }
    return query;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'legacy') return 'legacy';
    if (stored === 'pixi' || stored === 'immersive') return 'immersive';
  } catch {
    // Use the immersive renderer when storage is unavailable.
  }
  return 'immersive';
};

export class HologramSandbox implements WorldRenderSurface {
  private readonly renderer: WorldRenderSurface;

  constructor(container: HTMLElement, actions: WorldRenderActions) {
    const mode = resolveMode();
    this.renderer = mode === 'legacy'
      ? new LegacyHologramSandbox(container, actions)
      : mode === 'pixi'
        ? new PixiGameWorld(container, actions)
        : new ImmersivePixiWorld(container, actions);
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
