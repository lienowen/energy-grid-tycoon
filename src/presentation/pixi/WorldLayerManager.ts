import { Container } from 'pixi.js';

export interface WorldLayers {
  terrain: Container;
  roads: Container;
  groundDecorations: Container;
  buildingShadows: Container;
  buildings: Container;
  vehicles: Container;
  effects: Container;
  overlays: Container;
}

const makeLayer = (label: string, zIndex: number): Container => {
  const layer = new Container();
  layer.label = label;
  layer.zIndex = zIndex;
  layer.sortableChildren = true;
  return layer;
};

export class WorldLayerManager {
  readonly root = new Container();
  readonly layers: WorldLayers;

  constructor() {
    this.root.label = 'world-root';
    this.root.sortableChildren = true;
    this.root.isRenderGroup = true;
    this.layers = {
      terrain: makeLayer('terrain', 0),
      roads: makeLayer('roads', 1),
      groundDecorations: makeLayer('ground-decorations', 2),
      buildingShadows: makeLayer('building-shadows', 3),
      buildings: makeLayer('buildings', 4),
      vehicles: makeLayer('vehicles', 5),
      effects: makeLayer('effects', 6),
      overlays: makeLayer('overlays', 7)
    };
    this.root.addChild(...Object.values(this.layers));
  }

  clear(): void {
    for (const layer of Object.values(this.layers)) {
      for (const child of layer.removeChildren()) child.destroy();
    }
  }

  sortDynamicLayers(): void {
    this.layers.buildings.sortChildren();
    this.layers.vehicles.sortChildren();
    this.layers.effects.sortChildren();
    this.layers.overlays.sortChildren();
  }
}
