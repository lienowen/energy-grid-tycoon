import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { WorldCamera } from './WorldCamera';

const authoredCamera = {
  startZoom: 1.24,
  minZoom: 0.86,
  maxZoom: 2.05,
  startOffsetX: 18,
  startOffsetY: 4,
  panLimitX: 170,
  panLimitY: 120
};

describe('WorldCamera product framing', () => {
  it('gives authored city scenes a tighter opening frame', () => {
    const target = new Container();
    const camera = new WorldCamera(target);
    camera.setViewport(1200, 800);
    camera.configure(authoredCamera);
    camera.setPivot(100, 80);
    camera.focusHome();

    expect(target.scale.x).toBeCloseTo(1.364, 3);
    expect(target.position.x).toBe(618);
    expect(target.position.y).toBe(396);
  });

  it('does not apply the authored zoom bonus to procedural scenes', () => {
    const target = new Container();
    const camera = new WorldCamera(target);
    camera.setViewport(1200, 800);
    camera.configure({ ...authoredCamera, panLimitX: 420, panLimitY: 280 });
    camera.focusHome();

    expect(target.scale.x).toBeCloseTo(1.24, 3);
  });
});
