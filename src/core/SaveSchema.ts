export interface BuildingSnapshot {
  instanceId: string;
  configId: string;
  enabled: boolean;
  storedEnergy: number;
  level: number;
  placementId?: string;
}

export interface ActiveEventSnapshot {
  eventId: string;
  remainingHours: number;
}

export interface TelemetrySnapshot {
  day: number;
  hour: number;
  money: number;
  demand: number;
  supply: number;
  satisfaction: number;
  pollution: number;
  storageEnergy: number;
  researchPoints: number;
  profit: number;
  shortage: number;
}
