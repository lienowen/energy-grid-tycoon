import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { WorldCamera } from './WorldCamera';

const worldCamera = {
  startZoom: 1.24,
  minZoom: 0.5,
  maxZoom: 2.4,
  startOffsetX: 18,
  startOffsetY: 4,
  panLimitX: 520,
  panLimitY: 360
};

describe('WorldCamera world-space framing', () => {
  it('uses the layout zoom directly without a model-table bonus', () => {
    const target = new Container();
    const camera = new WorldCamera(target);
    camera.setViewport(1200, 800);
    camera.configure(worldCamera);
    camera.setPivot(100, 80);
    camera.focusHome();

    expect(target.scale.x).toBeCloseTo(1.24, 3);
    expect(target.position.x).toBe(618);
    expect(target.position.y).toBe(388);
  });

  it('keeps a local city view on phones instead of fitting the complete map', () => {
    const target = new Container();
    const camera = new WorldCamera(target);
    camera.setViewport(390, 844);
    camera.configure(worldCamera);
    camera.focusHome();

    expect(target.scale.x).toBeCloseTo(0.9672, 3);
    expect(target.position.x).toBeCloseTo(201.3, 2);
    expect(target.position.y).toBeCloseTo(423.8, 2);
  });

  it('respects expanded world pan limits while preserving zoom', () => {
    const target = new Container();
    const camera = new WorldCamera(target);
    camera.setViewport(1200, 800);
    camera.configure(worldCamera);
    camera.focusHome();
    camera.panBy(900, 900);

    expect(target.scale.x).toBeCloseTo(1.24, 3);
    expect(target.position.x).toBe(1138);
    expect(target.position.y).toBe(748);
  });
});
