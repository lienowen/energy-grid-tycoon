import type { BuildingSnapshot } from '../core/SaveSchema';
import { BuildingBase, BuildingConfig } from './BuildingBase';
import { BuildingFactory } from './BuildingFactory';

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

  getStorageBuildings(): readonly BuildingBase[] {
    return this.buildings.filter((building) => building.config.category === 'storage');
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

  getTotalStoredEnergy(): number {
    return this.getStorageBuildings().reduce((sum, building) => sum + building.storedEnergy, 0);
  }

  getTotalStorageCapacity(): number {
    return this.getStorageBuildings().reduce((sum, building) => sum + building.getStorageCapacity(), 0);
  }

  countByConfigId(configId: string): number {
    return this.buildings.filter((building) => building.config.id === configId).length;
  }

  toSnapshots(): BuildingSnapshot[] {
    return this.buildings.map((building) => building.toSnapshot());
  }

  static restore(
    snapshots: BuildingSnapshot[],
    catalog: Map<string, BuildingConfig>
  ): BuildingManager {
    const manager = new BuildingManager();

    for (const snapshot of snapshots) {
      const config = catalog.get(snapshot.configId);
      if (!config) continue;
      manager.add(BuildingFactory.create(config, snapshot));
    }

    return manager;
  }
}
