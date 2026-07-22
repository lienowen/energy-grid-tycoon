import { describe, expect, it } from 'vitest';
import {
  getDiamondPoints,
  pointInPolygon,
  projectWorldPoint,
  type HologramViewport,
  type SandboxCameraState
} from './HologramGeometry';

const viewport: HologramViewport = { width: 1200, height: 760 };
const camera: SandboxCameraState = { zoom: 1, offsetX: 0, offsetY: 0 };

describe('HologramGeometry', () => {
  it('projects the world origin into the visual center of the sandbox', () => {
    expect(projectWorldPoint({ x: 0, z: 0, elevation: 0 }, camera, viewport)).toEqual({
      x: 600,
      y: 395.2
    });
  });

  it('moves elevated objects upward without changing their horizontal position', () => {
    const ground = projectWorldPoint({ x: 12, z: -5, elevation: 0 }, camera, viewport);
    const raised = projectWorldPoint({ x: 12, z: -5, elevation: 3 }, camera, viewport);
    expect(raised.x).toBe(ground.x);
    expect(raised.y).toBeLessThan(ground.y);
  });

  it('detects selectable points inside projected city diamonds', () => {
    const diamond = getDiamondPoints(
      { x: 0, z: 0, elevation: 0 },
      8,
      6,
      camera,
      viewport
    );
    const center = projectWorldPoint({ x: 0, z: 0, elevation: 0 }, camera, viewport);
    expect(pointInPolygon(center, diamond)).toBe(true);
    expect(pointInPolygon({ x: 10, y: 10 }, diamond)).toBe(false);
  });
});
