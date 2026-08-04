import * as PIXI from "pixi.js";

export type DistrictVisualState = "offline" | "online" | "danger";

export class DistrictRenderer extends PIXI.Container {

  private body: PIXI.Graphics;
  private glow: PIXI.Graphics;
  private state: DistrictVisualState = "offline";
  private pulse = 0;

  constructor(
    public id: string,
    public name: string,
    public x: number,
    public y: number,
    public size = 60
  ) {
    super();

    this.body = new PIXI.Graphics();
    this.glow = new PIXI.Graphics();

    this.addChild(this.glow);
    this.addChild(this.body);

    this.position.set(x, y);
    this.draw();
  }

  setState(state: DistrictVisualState) {
    this.state = state;
    this.draw();
  }

  update(delta: number) {
    if (this.state === "danger") {
      this.pulse += delta * 0.01;
      this.alpha = 0.75 + Math.sin(this.pulse) * 0.25;
    } else {
      this.alpha = 1;
    }
  }

  private draw() {
    this.body.clear();
    this.glow.clear();

    let color = 0x333333;

    if (this.state === "online") {
      color = 0x00d9ff;
    }

    if (this.state === "danger") {
      color = 0xff355d;
    }

    this.glow.beginFill(color, 0.18);
    this.glow.drawCircle(0, 0, this.size * 0.9);
    this.glow.endFill();

    this.body.beginFill(color);
    this.body.drawRoundedRect(
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size,
      8
    );
    this.body.endFill();
  }
}
