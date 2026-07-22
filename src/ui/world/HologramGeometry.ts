import type { ScenePoint } from '../../presentation/CitySceneMapper';

export interface HologramViewport {
  width: number;
  height: number;
}

export interface SandboxCameraState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

const getScale = (viewport: HologramViewport): number =>
  Math.max(4.5, Math.min(viewport.width / 128, viewport.height / 83));

export const projectWorldPoint = (
  point: ScenePoint,
  camera: SandboxCameraState,
  viewport: HologramViewport
): ScreenPoint => {
  const scale = getScale(viewport) * camera.zoom;
  return {
    x: viewport.width * 0.5 + camera.offsetX + (point.x - point.z) * scale * 0.78,
    y: viewport.height * 0.52 + camera.offsetY + (point.x + point.z) * scale * 0.31
      - point.elevation * scale * 1.15
  };
};

export const getDiamondPoints = (
  center: ScenePoint,
  radiusX: number,
  radiusZ: number,
  camera: SandboxCameraState,
  viewport: HologramViewport
): ScreenPoint[] => [
  projectWorldPoint({ ...center, x: center.x - radiusX }, camera, viewport),
  projectWorldPoint({ ...center, z: center.z - radiusZ }, camera, viewport),
  projectWorldPoint({ ...center, x: center.x + radiusX }, camera, viewport),
  projectWorldPoint({ ...center, z: center.z + radiusZ }, camera, viewport)
];

export const pointInPolygon = (point: ScreenPoint, polygon: readonly ScreenPoint[]): boolean => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    const intersects = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)
        / Math.max(0.00001, previousPoint.y - currentPoint.y) + currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const distanceBetween = (left: ScreenPoint, right: ScreenPoint): number =>
  Math.hypot(left.x - right.x, left.y - right.y);
