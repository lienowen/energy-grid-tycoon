import type { FacilitySceneState } from './CitySceneTypes';

// Repeated facility units remain separate in simulation but share one authored city landmark.
export const planCommercialFacilities = (
  facilities: readonly FacilitySceneState[]
): FacilitySceneState[] => {
  const solar = facilities.filter((facility) => facility.configId === 'solar_basic');
  if (solar.length <= 1) return [...facilities];

  const first = solar[0]!;
  const mergedSolar: FacilitySceneState = {
    ...first,
    name: '曙光光伏场',
    x: solar.reduce((sum, facility) => sum + facility.x, 0) / solar.length,
    z: solar.reduce((sum, facility) => sum + facility.z, 0) / solar.length,
    elevation: Math.max(...solar.map((facility) => facility.elevation)),
    // Two simulation units read as one landmark, but must remain subordinate to
    // the district composition instead of becoming an oversized utility block.
    scale: Math.max(...solar.map((facility) => facility.scale)) * 1.08,
    output: solar.reduce((sum, facility) => sum + facility.output, 0)
  };

  return [
    mergedSolar,
    ...facilities.filter((facility) => facility.configId !== 'solar_basic')
  ];
};
