import type {
  DistrictPrefabSceneState,
  FacilitySceneState
} from '../CitySceneTypes';
import { CITY01_ART_V2 } from '../art-v2/City01ArtV2Theme';

export type FacilityMotionKind = 'wind' | 'gas' | 'storage' | 'solar' | 'grid' | 'none';

export interface City01GroundingProfile {
  /** Logical footprint measured in Tile World cells. */
  footprintColumns: number;
  footprintRows: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  footprintColor: number;
  roadConnection: boolean;
  roadSearchRadius: number;
  roadWidth: number;
}

export interface City01BuildingPresentationProfile extends City01GroundingProfile {
  width: number;
  anchorY: number;
  elevationOffset: number;
  toneTint: number;
  hitWidthFactor: number;
  hitHeightFactor: number;
  hitOffsetYFactor: number;
  detailMinZoom: number;
}

export interface City01FacilityPresentationProfile extends City01BuildingPresentationProfile {
  motion: FacilityMotionKind;
  motionColor: number;
  motionAnchorY: number;
  motionMinZoom: number;
}

const THEME = CITY01_ART_V2;

const DISTRICT_PROFILES: Record<
  DistrictPrefabSceneState['kind'],
  Omit<City01BuildingPresentationProfile, 'width'>
> = {
  residential: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintColumns: 3,
    footprintRows: 2,
    shadowOffsetX: 8,
    shadowOffsetY: 9,
    footprintColor: THEME.palette.building.residentialFootprint,
    roadConnection: true,
    roadSearchRadius: 52,
    roadWidth: 6,
    toneTint: THEME.palette.building.neutralTint,
    hitWidthFactor: 0.82,
    hitHeightFactor: 0.88,
    hitOffsetYFactor: 0.03,
    detailMinZoom: 0.82
  },
  commercial: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintColumns: 3,
    footprintRows: 2,
    shadowOffsetX: 8,
    shadowOffsetY: 9,
    footprintColor: THEME.palette.building.commercialFootprint,
    roadConnection: true,
    roadSearchRadius: 52,
    roadWidth: 7,
    toneTint: THEME.palette.building.warmTint,
    hitWidthFactor: 0.84,
    hitHeightFactor: 0.88,
    hitOffsetYFactor: 0.03,
    detailMinZoom: 0.82
  },
  industrial: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintColumns: 3,
    footprintRows: 2,
    shadowOffsetX: 9,
    shadowOffsetY: 10,
    footprintColor: THEME.palette.building.industrialFootprint,
    roadConnection: true,
    roadSearchRadius: 58,
    roadWidth: 8,
    toneTint: THEME.palette.building.neutralTint,
    hitWidthFactor: 0.86,
    hitHeightFactor: 0.9,
    hitOffsetYFactor: 0.03,
    detailMinZoom: 0.8
  },
  public: {
    anchorY: 0.905,
    elevationOffset: 0.12,
    footprintColumns: 2,
    footprintRows: 2,
    shadowOffsetX: 6,
    shadowOffsetY: 7,
    footprintColor: THEME.palette.building.publicFootprint,
    roadConnection: true,
    roadSearchRadius: 44,
    roadWidth: 6,
    toneTint: THEME.palette.building.neutralTint,
    hitWidthFactor: 0.78,
    hitHeightFactor: 0.84,
    hitOffsetYFactor: 0.02,
    detailMinZoom: 0.78
  },
  old_town: {
    anchorY: 0.9115,
    elevationOffset: 0.18,
    footprintColumns: 3,
    footprintRows: 2,
    shadowOffsetX: 9,
    shadowOffsetY: 10,
    footprintColor: THEME.palette.building.oldTownFootprint,
    roadConnection: true,
    roadSearchRadius: 54,
    roadWidth: 6,
    toneTint: THEME.palette.building.warmTint,
    hitWidthFactor: 0.85,
    hitHeightFactor: 0.9,
    hitOffsetYFactor: 0.03,
    detailMinZoom: 0.8
  }
};

const DISTRICT_WIDTHS: Record<DistrictPrefabSceneState['kind'], number> = {
  residential: 312,
  commercial: 310,
  industrial: 318,
  public: 252,
  old_town: 316
};

const facilityBaseWidth = (facility: FacilitySceneState): number => {
  if (facility.configId.includes('solar')) return 218;
  if (facility.configId.includes('wind')) return 204;
  if (facility.configId.includes('gas')) return 224;
  if (facility.configId.includes('battery')) return 210;
  if (facility.configId.includes('substation')) return 210;
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
  if (facility.category === 'storage') return THEME.palette.building.storageFootprint;
  if (facility.configId.includes('gas')
    || facility.configId.includes('wind')
    || facility.configId.includes('solar')) {
    return THEME.palette.building.generationFootprint;
  }
  return THEME.palette.building.gridFootprint;
};

const facilityMotionColor = (motion: FacilityMotionKind): number => {
  if (motion === 'wind') return THEME.palette.status.positive;
  if (motion === 'gas') return THEME.palette.ui.textSecondary;
  if (motion === 'storage') return THEME.palette.status.information;
  if (motion === 'solar') return THEME.palette.status.warning;
  if (motion === 'grid') return THEME.palette.status.information;
  return THEME.palette.ui.textPrimary;
};

const facilityMotionAnchorY = (motion: FacilityMotionKind): number => {
  if (motion === 'wind') return -0.43;
  if (motion === 'gas') return -0.34;
  if (motion === 'storage') return -0.18;
  if (motion === 'solar') return -0.12;
  if (motion === 'grid') return -0.22;
  return 0;
};

const facilityFootprint = (facility: FacilitySceneState, motion: FacilityMotionKind): {
  columns: number;
  rows: number;
} => {
  if (facility.configId.includes('offshore')) return { columns: 1, rows: 1 };
  if (motion === 'gas') return { columns: 2, rows: 2 };
  if (motion === 'solar') return { columns: 2, rows: 1 };
  if (motion === 'wind') return { columns: 1, rows: 1 };
  return { columns: 1, rows: 1 };
};

const facilityToneTint = (motion: FacilityMotionKind): number => {
  if (motion === 'gas' || motion === 'solar') return THEME.palette.building.warmTint;
  if (motion === 'wind' || motion === 'storage' || motion === 'grid') {
    return THEME.palette.building.coolTint;
  }
  return THEME.palette.building.neutralTint;
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
  const footprint = facilityFootprint(facility, motion);
  const scale = Math.min(1.18, Math.max(0.85, facility.scale));
  const offshore = facility.configId.includes('offshore');
  return {
    width: facilityBaseWidth(facility) * scale * 0.76,
    anchorY: 0.9115,
    elevationOffset: 0.12,
    footprintColumns: footprint.columns,
    footprintRows: footprint.rows,
    shadowOffsetX: motion === 'wind' ? 5 : 6,
    shadowOffsetY: motion === 'wind' ? 7 : 8,
    footprintColor: facilityGroundColor(facility),
    roadConnection: !offshore,
    roadSearchRadius: motion === 'gas' ? 48 : 42,
    roadWidth: motion === 'gas' ? 7 : 5,
    toneTint: facilityToneTint(motion),
    hitWidthFactor: motion === 'wind' ? 0.76 : 0.82,
    hitHeightFactor: motion === 'wind' ? 1.18 : 0.92,
    hitOffsetYFactor: motion === 'wind' ? -0.08 : 0.02,
    detailMinZoom: 0.76,
    motion,
    motionColor: facilityMotionColor(motion),
    motionAnchorY: facilityMotionAnchorY(motion),
    motionMinZoom: motion === 'gas' ? 0.92 : 0.86
  };
};

export const CITY01_LIGHT_DIRECTION = {
  source: THEME.direction.lightSource,
  shadowOffsetX: THEME.direction.shadowScreenOffsetX,
  shadowOffsetY: THEME.direction.shadowScreenOffsetY
} as const;
