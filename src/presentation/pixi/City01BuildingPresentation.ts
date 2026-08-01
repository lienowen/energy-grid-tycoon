import type {
  DistrictPrefabSceneState,
  FacilitySceneState
} from '../CitySceneTypes';

export type FacilityMotionKind = 'wind' | 'gas' | 'storage' | 'solar' | 'grid' | 'none';

export interface City01GroundingProfile {
  footprintWidthFactor: number;
  footprintHeightFactor: number;
  shadowWidthFactor: number;
  shadowHeightFactor: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  footprintColor: number;
}

export interface City01BuildingPresentationProfile extends City01GroundingProfile {
  width: number;
  anchorY: number;
  elevationOffset: number;
}

export interface City01FacilityPresentationProfile extends City01BuildingPresentationProfile {
  motion: FacilityMotionKind;
  motionColor: number;
  motionAnchorY: number;
}

const DISTRICT_PROFILES: Record<
  DistrictPrefabSceneState['kind'],
  Omit<City01BuildingPresentationProfile, 'width'>
> = {
  residential: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintWidthFactor: 0.265,
    footprintHeightFactor: 0.062,
    shadowWidthFactor: 0.34,
    shadowHeightFactor: 0.078,
    shadowOffsetX: 7,
    shadowOffsetY: 9,
    footprintColor: 0x4f7458
  },
  commercial: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintWidthFactor: 0.27,
    footprintHeightFactor: 0.064,
    shadowWidthFactor: 0.35,
    shadowHeightFactor: 0.08,
    shadowOffsetX: 7,
    shadowOffsetY: 9,
    footprintColor: 0x747052
  },
  industrial: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintWidthFactor: 0.29,
    footprintHeightFactor: 0.068,
    shadowWidthFactor: 0.37,
    shadowHeightFactor: 0.086,
    shadowOffsetX: 8,
    shadowOffsetY: 10,
    footprintColor: 0x65625f
  },
  public: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintWidthFactor: 0.27,
    footprintHeightFactor: 0.064,
    shadowWidthFactor: 0.35,
    shadowHeightFactor: 0.08,
    shadowOffsetX: 7,
    shadowOffsetY: 9,
    footprintColor: 0x4d7067
  },
  old_town: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintWidthFactor: 0.285,
    footprintHeightFactor: 0.068,
    shadowWidthFactor: 0.36,
    shadowHeightFactor: 0.084,
    shadowOffsetX: 8,
    shadowOffsetY: 10,
    footprintColor: 0x735e49
  }
};

const DISTRICT_WIDTHS: Record<DistrictPrefabSceneState['kind'], number> = {
  residential: 312,
  commercial: 310,
  industrial: 318,
  public: 310,
  old_town: 316
};

const facilityBaseWidth = (facility: FacilitySceneState): number => {
  if (facility.configId.includes('solar')) return 218;
  if (facility.configId.includes('wind')) return 204;
  if (facility.configId.includes('gas')) return 224;
  if (facility.configId.includes('battery')) return 210;
  return 210;
};

const facilityMotion = (facility: FacilitySceneState): FacilityMotionKind => {
  if (facility.configId.includes('wind')) return 'wind';
  if (facility.configId.includes('gas')) return 'gas';
  if (facility.category === 'storage' || facility.configId.includes('battery')) return 'storage';
  if (facility.configId.includes('solar')) return 'solar';
  if (facility.configId.includes('substation') || facility.configId.includes('grid')) return 'grid';
  return 'none';
};

const facilityGroundColor = (facility: FacilitySceneState): number => {
  if (facility.category === 'storage') return 0x3f7580;
  if (facility.configId.includes('wind')) return 0x4d786c;
  if (facility.configId.includes('solar')) return 0x597555;
  if (facility.configId.includes('gas')) return 0x77644d;
  return 0x546b69;
};

const facilityMotionColor = (motion: FacilityMotionKind): number => {
  if (motion === 'wind') return 0x9ce8d2;
  if (motion === 'gas') return 0xc9d4cf;
  if (motion === 'storage') return 0x67e8f9;
  if (motion === 'solar') return 0xffe08a;
  if (motion === 'grid') return 0x63d8ff;
  return 0xffffff;
};

const facilityMotionAnchorY = (motion: FacilityMotionKind): number => {
  if (motion === 'wind') return -0.43;
  if (motion === 'gas') return -0.34;
  if (motion === 'storage') return -0.18;
  if (motion === 'solar') return -0.12;
  if (motion === 'grid') return -0.22;
  return 0;
};

export const resolveDistrictPresentation = (
  district: DistrictPrefabSceneState
): City01BuildingPresentationProfile => ({
  ...DISTRICT_PROFILES[district.kind],
  width: DISTRICT_WIDTHS[district.kind] * district.scale
});

export const resolveFacilityPresentation = (
  facility: FacilitySceneState
): City01FacilityPresentationProfile => {
  const motion = facilityMotion(facility);
  const scale = Math.min(1.18, Math.max(0.85, facility.scale));
  return {
    width: facilityBaseWidth(facility) * scale * 0.68,
    anchorY: 0.9115,
    elevationOffset: 0.12,
    footprintWidthFactor: motion === 'wind' ? 0.22 : 0.25,
    footprintHeightFactor: motion === 'wind' ? 0.052 : 0.06,
    shadowWidthFactor: motion === 'wind' ? 0.29 : 0.33,
    shadowHeightFactor: motion === 'wind' ? 0.071 : 0.082,
    shadowOffsetX: motion === 'wind' ? 5 : 6,
    shadowOffsetY: motion === 'wind' ? 7 : 8,
    footprintColor: facilityGroundColor(facility),
    motion,
    motionColor: facilityMotionColor(motion),
    motionAnchorY: facilityMotionAnchorY(motion)
  };
};

export const CITY01_LIGHT_DIRECTION = {
  source: 'upper-left',
  shadowOffsetX: 1,
  shadowOffsetY: 1
} as const;
