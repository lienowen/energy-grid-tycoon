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
  private panLimitX = 420;
  private panLimitY = 280;
  private homePositionX = 0;
  private homePositionY = 0;
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
    // Authored City-01 scenes are framed as a city-management view: the urban
    // footprint fills the viewport and the model-table edge stays outside it.
    const authoredFraming = (config.panLimitX ?? 420) <= 220 ? 1.14 : 1;
    this.homeZoom = clamp(config.startZoom * authoredFraming, this.minZoom, this.maxZoom);
    this.homeOffsetX = config.startOffsetX;
    this.homeOffsetY = config.startOffsetY;
    this.panLimitX = Math.max(0, config.panLimitX ?? 420);
    this.panLimitY = Math.max(0, config.panLimitY ?? 280);
  }

  setPivot(x: number, y: number): void {
    this.target.pivot.set(x, y);
  }

  focusHome(): void {
    const portrait = this.viewportHeight > this.viewportWidth * 1.2;
    const viewportZoom = this.viewportWidth <= 520
      ? 0.58
      : portrait && this.viewportWidth <= 900
        ? 0.84
        : this.viewportWidth <= 1100
          ? 0.94
          : 1;
    const zoom = clamp(this.homeZoom * viewportZoom, this.minZoom, this.maxZoom);
    const offsetX = this.viewportWidth <= 520 ? this.homeOffsetX * 0.18 : this.homeOffsetX;
    const offsetY = this.viewportWidth <= 520
      ? Math.min(8, this.homeOffsetY * 0.2)
      : portrait
        ? Math.min(18, this.homeOffsetY * 0.45)
        : this.homeOffsetY;

    this.target.scale.set(zoom);
    this.homePositionX = this.viewportWidth * 0.5 + offsetX;
    this.homePositionY = this.viewportHeight * (portrait ? 0.5 : 0.48) + offsetY;
    this.target.position.set(this.homePositionX, this.homePositionY);
  }

  panBy(deltaX: number, deltaY: number): void {
    this.target.position.set(
      clamp(this.target.position.x + deltaX, this.homePositionX - this.panLimitX, this.homePositionX + this.panLimitX),
      clamp(this.target.position.y + deltaY, this.homePositionY - this.panLimitY, this.homePositionY + this.panLimitY)
    );
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
      clamp(
        focusX - (localX - this.target.pivot.x) * nextZoom,
        this.homePositionX - this.panLimitX,
        this.homePositionX + this.panLimitX
      ),
      clamp(
        focusY - (localY - this.target.pivot.y) * nextZoom,
        this.homePositionY - this.panLimitY,
        this.homePositionY + this.panLimitY
      )
    );
  }
}
