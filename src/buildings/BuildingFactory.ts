import { BuildingBase } from './BuildingBase';

export class BuildingFactory {
  static create(config: any) {
    return new BuildingBase(
      config.id,
      config.power ?? 0,
      config.cost ?? 0
    );
  }
}
