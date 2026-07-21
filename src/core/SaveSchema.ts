export interface BuildingSnapshot {
  instanceId: string;
  configId: string;
  enabled: boolean;
  storedEnergy: number;
}

export interface ActiveEventSnapshot {
  eventId: string;
  remainingHours: number;
}
