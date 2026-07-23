import { Container } from 'pixi.js';
import type { HologramCameraConfig } from '../CitySceneMapper';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class WorldCamera {
  private minZoom = 0.55;
  private maxZoom = 2.4;
  private homeZoom = 1;
  private homeOffsetX = 0;
  private homeOffsetY = 0;
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor(private readonly target: Container) {}

  setViewport(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
  }

  configure(config: HologramCameraConfig): void {
    this.minZoom = config.minZoom;
    this.maxZoom = config.maxZoom;
    this.homeZoom = clamp(config.startZoom, this.minZoom, this.maxZoom);
    this.homeOffsetX = config.startOffsetX;
    this.homeOffsetY = config.startOffsetY;
  }

  setPivot(x: number, y: number): void {
    this.target.pivot.set(x, y);
  }

  focusHome(): void {
    this.target.scale.set(this.homeZoom);
    this.target.position.set(
      this.viewportWidth * 0.5 + this.homeOffsetX,
      this.viewportHeight * 0.52 + this.homeOffsetY
    );
  }

  panBy(deltaX: number, deltaY: number): void {
    this.target.position.x += deltaX;
    this.target.position.y += deltaY;
  }

  zoomBy(factor: number, screenX?: number, screenY?: number): void {
    const oldZoom = this.target.scale.x || 1;
    const nextZoom = clamp(oldZoom * factor, this.minZoom, this.maxZoom);
    if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

    const focusX = screenX ?? this.viewportWidth * 0.5;
    const focusY = screenY ?? this.viewportHeight * 0.5;
    const localX = (focusX - this.target.position.x) / oldZoom + this.target.pivot.x;
    const localY = (focusY - this.target.position.y) / oldZoom + this.target.pivot.y;

    this.target.scale.set(nextZoom);
    this.target.position.set(
      focusX - (localX - this.target.pivot.x) * nextZoom,
      focusY - (localY - this.target.pivot.y) * nextZoom
    );
  }
}
