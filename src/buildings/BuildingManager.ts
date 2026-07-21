import { BuildingBase } from './BuildingBase';

export class BuildingManager {
  private buildings: BuildingBase[] = [];

  add(building: BuildingBase) {
    this.buildings.push(building);
  }

  getBuildings() {
    return this.buildings;
  }

  getTotalPower() {
    return this.buildings.reduce((sum, building) => sum + building.powerOutput, 0);
  }
}
