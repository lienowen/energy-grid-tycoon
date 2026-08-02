export const CITY01_ART_V2 = {
  revision: 'city01-art-v2-foundation-1',
  direction: {
    camera: 'isometric-2-to-1',
    lightSource: 'upper-left',
    lightAzimuthDegrees: 315,
    lightElevationDegrees: 45,
    shadowScreenOffsetX: 1,
    shadowScreenOffsetY: 1
  },
  palette: {
    ocean: {
      deep: 0x061f2b,
      mid: 0x073746,
      shallow: 0x0b5967,
      highlight: 0x83d8dc,
      foam: 0xd8f4ec
    },
    terrain: {
      grassFallback: 0x526f57,
      lockedFallback: 0x34453f,
      landTint: 0xe6f0e2,
      waterTint: 0xd4eef1,
      lockedTint: 0x78817c,
      diagnosticGrid: 0x94b7aa
    },
    road: {
      shoulder: 0x9aa39c,
      asphalt: 0x293438,
      bridgeAsphalt: 0x30454a,
      centerLine: 0xe7e0c8,
      bridgeRail: 0x172d32
    },
    building: {
      residentialFootprint: 0x536b5b,
      commercialFootprint: 0x6c6858,
      industrialFootprint: 0x5c6160,
      publicFootprint: 0x506d68,
      oldTownFootprint: 0x695d50,
      generationFootprint: 0x5a695d,
      storageFootprint: 0x496873,
      gridFootprint: 0x4d6668,
      neutralTint: 0xf1f4f0,
      coolTint: 0xe8f2f2,
      warmTint: 0xf4eee2
    },
    status: {
      positive: 0x62d6b0,
      information: 0x63cce4,
      warning: 0xf0bd63,
      danger: 0xe96f78,
      muted: 0x728187
    },
    ui: {
      panel: 0x0a1c24,
      panelRaised: 0x102a34,
      border: 0x41616a,
      textPrimary: 0xf2f5f2,
      textSecondary: 0xaebfbd,
      accent: 0x68d3c0
    }
  },
  terrain: {
    spriteOverscanX: 2.5,
    spriteOverscanY: 1.25,
    sparseWaterHighlightModulo: 11,
    sparseWaterHighlightAlpha: 0.16,
    lockedSaturation: 0.58
  },
  road: {
    shoulderExtraWidth: 4,
    centerLineWidth: 1.15,
    centerLineAlpha: 0.48,
    normalAlpha: 0.96,
    diagnosticAlpha: 0.92
  },
  grounding: {
    outerShadowAlpha: 0.045,
    middleShadowAlpha: 0.065,
    contactShadowAlpha: 0.1,
    footprintAlpha: 0.018,
    warningFootprintAlpha: 0.05
  }
} as const;

export type City01ArtV2Theme = typeof CITY01_ART_V2;

export const CITY01_ART_V2_LEGACY_POLICY = {
  legacyAssetsMayRender: true,
  legacyAssetsMayDefineColor: false,
  legacyAssetsMayDefineLighting: false,
  legacyAssetsMayDefineGrounding: false,
  newHardcodedPresentationColorsAllowed: false
} as const;
