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

describe('City01ArtV2Theme', () => {
  it('defines one versioned modern-isometric visual direction', () => {
    expect(CITY01_ART_V2.revision).toBe('city01-art-v2-foundation-1');
    expect(CITY01_ART_V2.direction.camera).toBe('isometric-2-to-1');
    expect(CITY01_ART_V2.direction.lightSource).toBe('upper-left');
    expect(CITY01_ART_V2.direction.lightAzimuthDegrees).toBe(315);
    expect(CITY01_ART_V2.direction.lightElevationDegrees).toBe(45);
  });

  it('keeps terrain and roads readable without arcade-level contrast', () => {
    const grass = perceivedLuma(CITY01_ART_V2.palette.terrain.grassFallback);
    const locked = perceivedLuma(CITY01_ART_V2.palette.terrain.lockedFallback);
    const asphalt = perceivedLuma(CITY01_ART_V2.palette.road.asphalt);
    const shoulder = perceivedLuma(CITY01_ART_V2.palette.road.shoulder);

    expect(grass).toBeGreaterThan(locked);
    expect(shoulder).toBeGreaterThan(asphalt + 45);
    expect(CITY01_ART_V2.road.centerLineAlpha).toBeLessThan(0.6);
    expect(CITY01_ART_V2.terrain.sparseWaterHighlightAlpha).toBeLessThan(0.2);
  });

  it('treats legacy art as temporary content rather than a style authority', () => {
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayRender).toBe(true);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineColor).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineLighting).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.legacyAssetsMayDefineGrounding).toBe(false);
    expect(CITY01_ART_V2_LEGACY_POLICY.newHardcodedPresentationColorsAllowed).toBe(false);
  });
});
