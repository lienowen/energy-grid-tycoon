import { BuildingBase } from './BuildingBase';

export type OutputResolver = (building: BuildingBase) => number;

export class BuildingManager {
  private readonly buildings: BuildingBase[] = [];

  add(building: BuildingBase): void {
    this.buildings.push(building);
  }

  remove(instanceId: string): boolean {
    const index = this.buildings.findIndex((item) => item.instanceId === instanceId);
    if (index < 0) return false;
    this.buildings.splice(index, 1);
    return true;
  }

  getBuildings(): readonly BuildingBase[] {
    return this.buildings;
  }

  getTotalPower(resolveMultiplier: OutputResolver = () => 1): number {
    return this.buildings.reduce(
      (sum, building) => sum + building.getPowerOutput(resolveMultiplier(building)),
      0
    );
  }

  getTotalMaintenance(): number {
    return this.buildings.reduce((sum, building) => sum + building.getMaintenance(), 0);
  }

  getTotalPollution(): number {
    return this.buildings.reduce((sum, building) => sum + building.getPollution(), 0);
  }

  countByConfigId(configId: string): number {
    return this.buildings.filter((building) => building.config.id === configId).length;
  }
}