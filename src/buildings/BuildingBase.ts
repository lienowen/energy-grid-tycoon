export interface BuildingConfig {
  id: string;
  type: string;
  power: number;
  cost: number;
  maintenance: number;
}

export class BuildingBase {
  constructor(public config: BuildingConfig) {}

  getPowerOutput(): number {
    return this.config.power;
  }

  getMaintenance(): number {
    return this.config.maintenance;
  }
}
