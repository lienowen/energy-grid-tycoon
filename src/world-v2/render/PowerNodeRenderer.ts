import * as PIXI from "pixi.js";

export type PowerNodeVisualState =
  | "offline"
  | "online"
  | "danger";

export type PowerNodeVisualType =
  | "plant"
  | "storage"
  | "district"
  | "relay";

export interface PowerNodeVisualData {
  id: string;
  type: PowerNodeVisualType;
  x: number;
  y: number;
  state: PowerNodeVisualState;
}

/**
 * P0 world visual component.
 * Simple node renderer first, replace sprites later.
 */
export class PowerNodeRenderer extends PIXI.Container {

  private data: PowerNodeVisualData;
  private body: PIXI.Graphics;
  private glow: PIXI.Graphics;
  private pulse = 0;

  constructor(data: PowerNodeVisualData) {
    super();

    this.data = data;

    this.position.set(data.x, data.y);

    this.body = new PIXI.Graphics();
    this.glow = new PIXI.Graphics();

    this.addChild(this.glow);
    this.addChild(this.body);

    this.draw();
  }

  setState(state: PowerNodeVisualState) {
    this.data.state = state;
    this.draw();
  }

  update(delta: number) {
    if (this.data.state === "online") {
      this.pulse += delta * 0.05;
      const scale = 1 + Math.sin(this.pulse) * 0.08;
      this.glow.scale.set(scale);
    }
  }

  private draw() {
    this.body.clear();
    this.glow.clear();

    const color = this.getColor();

    this.glow.beginFill(color, 0.18);
    this.glow.drawCircle(0, 0, 35);
    this.glow.endFill();

    this.body.beginFill(color);

    if (this.data.type === "plant") {
      this.body.drawRect(-18, -18, 36, 36);
    } else if (this.data.type === "storage") {
      this.body.drawRoundedRect(-16, -22, 32, 44, 6);
    } else if (this.data.type === "relay") {
      this.body.drawCircle(0, 0, 14);
    } else {
      this.body.drawPolygon([
        -20, 20,
        20, 20,
        0, -24
      ]);
    }

    this.body.endFill();
  }

  private getColor() {
    if (this.data.state === "danger") {
      return 0xff355d;
    }

    if (this.data.state === "online") {
      return 0x00d9ff;
    }

    return 0x334455;
  }
}
