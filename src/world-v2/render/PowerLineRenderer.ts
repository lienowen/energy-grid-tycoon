import * as PIXI from 'pixi.js';

export type PowerLineState = 'normal' | 'warning' | 'overload' | 'broken';

export interface PowerLineVisualData {
  from: { x: number; y: number };
  to: { x: number; y: number };
  state: PowerLineState;
  enabled: boolean;
}

/**
 * World V2 neon grid line renderer.
 *
 * The renderer intentionally separates:
 * - base energy line
 * - glow layer
 * - moving electricity particle
 *
 * This becomes the visual foundation for the Last Light Grid style.
 */
export class PowerLineRenderer extends PIXI.Container {
  private readonly line: PIXI.Graphics;
  private readonly glow: PIXI.Graphics;
  private readonly flow: PIXI.Graphics;

  private progress = 0;
  private data: PowerLineVisualData;

  constructor(data: PowerLineVisualData) {
    super();

    this.data = data;

    this.line = new PIXI.Graphics();
    this.glow = new PIXI.Graphics();
    this.flow = new PIXI.Graphics();

    this.addChild(this.glow);
    this.addChild(this.line);
    this.addChild(this.flow);

    this.redraw();
  }

  setData(data: PowerLineVisualData) {
    this.data = data;
    this.redraw();
  }

  update(delta: number) {
    if (!this.data.enabled || this.data.state === 'broken') {
      this.flow.clear();
      return;
    }

    const speed = this.data.state === 'overload' ? 0.02 : 0.008;
    this.progress = (this.progress + delta * speed) % 1;

    this.drawFlow();
  }

  private redraw() {
    const color = this.color();

    this.line.clear();
    this.glow.clear();

    this.glow.lineStyle(18, color, 0.18);
    this.glow.moveTo(this.data.from.x, this.data.from.y);
    this.glow.lineTo(this.data.to.x, this.data.to.y);

    this.line.lineStyle(5, color, 0.95);
    this.line.moveTo(this.data.from.x, this.data.from.y);
    this.line.lineTo(this.data.to.x, this.data.to.y);
  }

  private drawFlow() {
    this.flow.clear();

    const x = this.data.from.x +
      (this.data.to.x - this.data.from.x) * this.progress;
    const y = this.data.from.y +
      (this.data.to.y - this.data.from.y) * this.progress;

    this.flow.beginFill(0xffffff);
    this.flow.drawCircle(x, y, this.data.state === 'overload' ? 8 : 4);
    this.flow.endFill();
  }

  private color() {
    switch (this.data.state) {
      case 'warning': return 0xffb300;
      case 'overload': return 0xff355d;
      case 'broken': return 0x555555;
      default: return 0x00d9ff;
    }
  }
}
