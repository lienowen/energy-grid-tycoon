import { PixiGameWorld } from '../../presentation/pixi/PixiGameWorld';
import { HologramSandbox } from './HologramSandbox';
import type { WorldRenderActions, WorldRenderSurface } from './WorldRenderSurface';

export type WorldRendererMode = 'legacy' | 'pixi';

const STORAGE_KEY = 'energy-grid-tycoon.renderer';

export const resolveWorldRendererMode = (): WorldRendererMode => {
  const query = new URLSearchParams(window.location.search).get('renderer');
  if (query === 'pixi' || query === 'legacy') {
    try {
      window.localStorage.setItem(STORAGE_KEY, query);
    } catch {
      // Private browsing can reject storage; the query parameter still applies.
    }
    return query;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'pixi' || stored === 'legacy') return stored;
  } catch {
    // Keep the stable renderer when storage is unavailable.
  }
  return 'legacy';
};

export const createWorldRenderer = (
  host: HTMLElement,
  actions: WorldRenderActions,
  mode: WorldRendererMode = resolveWorldRendererMode()
): WorldRenderSurface => mode === 'pixi'
  ? new PixiGameWorld(host, actions)
  : new HologramSandbox(host, actions);
