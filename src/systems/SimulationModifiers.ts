export interface SimulationModifiers {
  generationMultiplier: number;
  demandMultiplier: number;
  priceMultiplier: number;
  maintenanceMultiplier: number;
  satisfactionDeltaPerHour: number;
  pollutionMultiplier: number;
  storageCapacityMultiplier: number;
  storageRateMultiplier: number;
  storageEfficiencyBonus: number;
  researchMultiplier: number;
}

export type SimulationModifierEffects = Partial<SimulationModifiers>
  & Record<string, number | undefined>;

export const neutralSimulationModifiers = (): SimulationModifiers => ({
  generationMultiplier: 1,
  demandMultiplier: 1,
  priceMultiplier: 1,
  maintenanceMultiplier: 1,
  satisfactionDeltaPerHour: 0,
  pollutionMultiplier: 1,
  storageCapacityMultiplier: 1,
  storageRateMultiplier: 1,
  storageEfficiencyBonus: 0,
  researchMultiplier: 1
});

const multiplicativeKeys: Array<keyof SimulationModifiers> = [
  'generationMultiplier',
  'demandMultiplier',
  'priceMultiplier',
  'maintenanceMultiplier',
  'pollutionMultiplier',
  'storageCapacityMultiplier',
  'storageRateMultiplier',
  'researchMultiplier'
];

export const mergeSimulationModifiers = (
  ...sources: Array<Partial<SimulationModifiers> | undefined>
): SimulationModifiers => {
  const merged = neutralSimulationModifiers();

  for (const source of sources) {
    if (!source) continue;

    for (const key of multiplicativeKeys) {
      const value = source[key];
      if (typeof value === 'number') merged[key] *= value;
    }

    merged.satisfactionDeltaPerHour += source.satisfactionDeltaPerHour ?? 0;
    merged.storageEfficiencyBonus += source.storageEfficiencyBonus ?? 0;
  }

  merged.storageEfficiencyBonus = Math.min(0.25, Math.max(-0.5, merged.storageEfficiencyBonus));
  return merged;
};
