import * as PIXI from "pixi.js";

export type EffectType =
  | "power_on"
  | "power_off"
  | "overload"
  | "warning";

export class EffectRenderer extends PIXI.Container {

  private particles: PIXI.Graphics[] = [];
  private life = 0;
  private type: EffectType;

  constructor(type: EffectType, x:number, y:number){
    super();
    this.type = type;
    this.create(x,y);
  }

  private create(x:number,y:number){
    const color = this.getColor();

    for(let i=0;i<8;i++){
      const p = new PIXI.Graphics();
      p.beginFill(color);
      p.drawCircle(0,0,3+Math.random()*4);
      p.endFill();
      p.x=x;
      p.y=y;
      p.alpha=1;
      this.addChild(p);
      this.particles.push(p);
    }
  }

  update(delta:number){
    this.life += delta;

    this.particles.forEach((p,index)=>{
      p.x += Math.cos(index)*delta*2;
      p.y -= delta*2;
      p.alpha -= delta*0.01;
      p.scale.set(1+this.life*0.01);
    });

    if(this.life>100){
      this.destroy();
    }
  }

  private getColor(){
    switch(this.type){
      case "overload": return 0xff355d;
      case "warning": return 0xffb300;
      case "power_off": return 0x444444;
      default: return 0x00d9ff;
    }
  }
}
