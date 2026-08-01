import type {
  FacilityVisualDescriptor,
  FacilityVisualFamily
} from './FacilityVisualRegistry';

export type City01FacilityLayerRole = 'body' | 'motion' | 'light' | 'effect';
export type City01FacilityLayerAnimation = 'none' | 'rotate' | 'pulse' | 'rise' | 'sweep';

export interface City01FacilityLayerSpec {
  role: City01FacilityLayerRole;
  assetId: string;
  required: boolean;
  animation: City01FacilityLayerAnimation;
  anchorX: number;
  anchorY: number;
  widthFactor: number;
  zOffset: number;
  minZoom: number;
}

export const CITY01_FACILITY_LAYER_CANVAS = {
  width: 512,
  height: 512,
  anchorX: 0.5,
  anchorY: 0.9115,
  baseline: 467
} as const;

const motionAnimation = (
  family: FacilityVisualFamily,
  role: City01FacilityLayerRole
): City01FacilityLayerAnimation => {
  if (role === 'motion' && family === 'wind') return 'rotate';
  if (role === 'effect' && family === 'gas') return 'rise';
  if (role === 'light' && family === 'solar') return 'sweep';
  if (role === 'light' && family === 'battery') return 'pulse';
  if (role === 'light' || role === 'effect') return 'pulse';
  return 'none';
};

const optionalLayer = (
  visual: FacilityVisualDescriptor,
  role: Exclude<City01FacilityLayerRole, 'body'>,
  assetId: string | undefined
): City01FacilityLayerSpec | undefined => {
  if (!assetId) return undefined;
  return {
    role,
    assetId,
    required: false,
    animation: motionAnimation(visual.family, role),
    anchorX: CITY01_FACILITY_LAYER_CANVAS.anchorX,
    anchorY: CITY01_FACILITY_LAYER_CANVAS.anchorY,
    widthFactor: 1,
    zOffset: role === 'effect' ? 30 : role === 'light' ? 20 : 10,
    minZoom: role === 'effect' ? 0.92 : 0.86
  };
};

/**
 * Returns the authoritative render stack for a facility.
 *
 * Body is mandatory. Component cuts are optional so the runtime may keep using
 * procedural motion until the matching transparent PNG has passed art QA.
 */
export const resolveCity01FacilityLayerStack = (
  visual: FacilityVisualDescriptor
): City01FacilityLayerSpec[] => {
  const layers: City01FacilityLayerSpec[] = [{
    role: 'body',
    assetId: visual.bodyAssetId,
    required: true,
    animation: 'none',
    anchorX: CITY01_FACILITY_LAYER_CANVAS.anchorX,
    anchorY: CITY01_FACILITY_LAYER_CANVAS.anchorY,
    widthFactor: 1,
    zOffset: 0,
    minZoom: 0
  }];

  const candidates = [
    optionalLayer(visual, 'motion', visual.motionAssetId),
    optionalLayer(visual, 'light', visual.lightAssetId),
    optionalLayer(visual, 'effect', visual.effectAssetId)
  ];
  for (const layer of candidates) {
    if (layer) layers.push(layer);
  }
  return layers;
};

export const CITY01_FACILITY_LAYER_FALLBACK = {
  missingOptionalLayer: 'procedural',
  missingBodyLayer: 'placeholder',
  hardGroundPadAllowed: false,
  bakedDropShadowAllowed: false
} as const;
