export const CITY01_ART_V2 = {
  revision: 'city01-art-v2-foundation-3',
  direction: {
    camera: 'isometric-2-to-1',
    lightSource: 'upper-left',
    lightAzimuthDegrees: 315,
    lightElevationDegrees: 45,
    shadowScreenOffsetX: 1,
    shadowScreenOffsetY: 1
  },
  atlasReference: {
    grassAverage: 0x497448,
    waterAverage: 0x08596f
  },
  palette: {
    ocean: {
      deep: 0x051920,
      mid: 0x082e38,
      shallow: 0x075267,
      highlight: 0x8acfd1,
      foam: 0xe4f3ec
    },
    terrain: {
      grassFallback: 0x41693e,
      lockedFallback: 0x213822,
      landTint: 0xe2e8dc,
      waterTint: 0xd7ecec,
      lockedTint: 0x737c78,
      diagnosticGrid: 0x9ab4aa
    },
    road: {
      shoulder: 0x929a94,
      asphalt: 0x273238,
      bridgeAsphalt: 0x2d4145,
      centerLine: 0xded6bd,
      bridgeRail: 0x172b2e
    },
    building: {
      residentialFootprint: 0x53675a,
      commercialFootprint: 0x686456,
      industrialFootprint: 0x595f5e,
      publicFootprint: 0x4f6965,
      oldTownFootprint: 0x675b4f,
      generationFootprint: 0x57665b,
      storageFootprint: 0x47646d,
      gridFootprint: 0x4c6365,
      neutralTint: 0xeff1ec,
      coolTint: 0xe5eeee,
      warmTint: 0xf1eadf
    },
    status: {
      positive: 0x63d1aa,
      information: 0x69c5da,
      warning: 0xe8b65e,
      danger: 0xe46f78,
      muted: 0x748187
    },
    ui: {
      canvas: 0x07141b,
      panel: 0x0a1a22,
      panelRaised: 0x10272f,
      panelSoft: 0x17323a,
      border: 0x38565e,
      borderStrong: 0x5a7b82,
      textPrimary: 0xf1f4f0,
      textSecondary: 0xaebdba,
      textMuted: 0x778b89,
      accent: 0x69cdb8,
      accentBright: 0x91e4d0,
      warm: 0xe8b65e
    }
  },
  atmosphere: {
    canvasBackground: 0x071e27,
    horizonAlpha: 0.18,
    worldVignetteAlpha: 0.22,
    lockedFogAlpha: 0.3,
    lockedFogEdgeAlpha: 0.46,
    waterSheenAlpha: 0.14,
    grainOpacity: 0.025
  },
  terrain: {
    spriteOverscanX: 2.5,
    spriteOverscanY: 1.25,
    sparseWaterHighlightModulo: 11,
    sparseWaterHighlightAlpha: 0.15,
    lockedSaturation: 0.56
  },
  road: {
    shoulderExtraWidth: 4,
    centerLineWidth: 1.05,
    centerLineAlpha: 0.42,
    normalAlpha: 0.96,
    diagnosticAlpha: 0.92
  },
  grounding: {
    outerShadowAlpha: 0.04,
    middleShadowAlpha: 0.06,
    contactShadowAlpha: 0.095,
    footprintAlpha: 0.016,
    warningFootprintAlpha: 0.048
  },
  ui: {
    radiusSmall: 8,
    radiusMedium: 12,
    radiusLarge: 18,
    panelBlurPx: 18,
    panelSaturation: 1.08,
    borderAlpha: 0.22,
    shadowAlpha: 0.36,
    motionFastMs: 150,
    motionNormalMs: 220
  }
} as const;

export type City01ArtV2Theme = typeof CITY01_ART_V2;

export const CITY01_ART_V2_LEGACY_POLICY = {
  legacyAssetsMayRender: true,
  legacyAssetsMayDefineColor: false,
  legacyAssetsMayDefineLighting: false,
  legacyAssetsMayDefineGrounding: false,
  legacyAssetsMayDefineUiChrome: false,
  newHardcodedPresentationColorsAllowed: false
} as const;
