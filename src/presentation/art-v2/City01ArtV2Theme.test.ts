import { describe, expect, it } from 'vitest';
import {
  CITY01_ART_V2,
  CITY01_ART_V2_LEGACY_POLICY
} from './City01ArtV2Theme';

const channel = (color: number, shift: number): number => (color >> shift) & 0xff;
const perceivedLuma = (color: number): number =>
  channel(color, 16) * 0.2126
  + channel(color, 8) * 0.7152
  + channel(color, 0) * 0.0722;

const multiplyColor = (source: number, tint: number): number => {
  const red = Math.round(channel(source, 16) * channel(tint, 16) / 255);
  const green = Math.round(channel(source, 8) * channel(tint, 8) / 255);
  const blue = Math.round(channel(source, 0) * channel(tint, 0) / 255);
  return (red << 16) | (green << 8) | blue;
};

const expectColorNear = (actual: number, expected: number, tolerance = 2): void => {
  expect(Math.abs(channel(actual, 16) - channel(expected, 16))).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(channel(actual, 8) - channel(expected, 8))).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(channel(actual, 0) - channel(expected, 0))).toBeLessThanOrEqual(tolerance);
};

describe('City01ArtV2Theme', () => {
  it('defines one versioned modern-isometric visual direction', () => {
    expect(CITY01_ART_V2.revision).toBe('city01-art-v2-foundation-4');
    expect(CITY01_ART_V2.direction.camera).toBe('isometric-2-to-1');
    expect(CITY01_ART_V2.direction.lightSource).toBe('upper-left');
    expect(CITY01_ART_V2.direction.lightAzimuthDegrees).toBe(315);
    expect(CITY01_ART_V2.direction.lightElevationDegrees).toBe(45);
  });

  it('matches every transparent tile fallback to the tinted atlas average', () => {
    const tintedGrass = multiplyColor(
      CITY01_ART_V2.atlasReference.grassAverage,
      CITY01_ART_V2.palette.terrain.landTint
    );
    expectColorNear(CITY01_ART_V2.palette.terrain.grassFallback, tintedGrass);
    expectColorNear(CITY01_ART_V2.palette.terrain.lockedFallback, tintedGrass);
    expectColorNear(
      CITY01_ART_V2.palette.ocean.shallow,
      multiplyColor(
        CITY01_ART_V2.atlasReference.waterAverage,
        CITY01_ART_V2.palette.terrain.waterTint
      )
    );
  });

  it('keeps base land continuous and expresses locked state with area fog', () => {
    const grass = perceivedLuma(CITY01_ART_V2.palette.terrain.grassFallback);
    const locked = perceivedLuma(CITY01_ART_V2.palette.terrain.lockedFallback);

    expect(locked).toBe(grass);
    expect(CITY01_ART_V2.palette.terrain.lockedTint)
      .toBe(CITY01_ART_V2.palette.terrain.landTint);
    expect(CITY01_ART_V2.atmosphere.lockedFogMode).toBe('merged-area-overlay');
    expect(CITY01_ART_V2.atmosphere.lockedFogAlpha).toBeGreaterThan(0.2);
    expect(CITY01_ART_V2.atmosphere.lockedFogAlpha).toBeLessThan(0.5);
    expect(CITY01_ART_V2.atmosphere.lockedFogEdgeAlpha)
      .toBeLessThan(CITY01_ART_V2.atmosphere.lockedFogAlpha);
  });

  it('keeps terrain and roads readable without arcade-level contrast', () => {
    const asphalt = perceivedLuma(CITY01_ART_V2.palette.road.asphalt);
    const shoulder = perceivedLuma(CITY01_ART_V2.palette.road.shoulder);

    expect(shoulder).toBeGreaterThan(asphalt + 45);
    expect(CITY01_ART_V2.road.centerLineAlpha).toBeLessThan(0.6);
    expect(CITY01_ART_V2.terrain.sparseWaterHighlightAlpha).toBeLessThan(0.2);
  });

  it('treats legacy art as temporary content rather than a style authority', () => {
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayRender).toBe(true);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineColor).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineLighting).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineGrounding).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineUiChrome).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.newHardcodedPresentationColorsAllowed).toBe(false);
  });
});
