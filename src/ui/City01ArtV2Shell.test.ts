import { describe, expect, it } from 'vitest';
import { CITY01_ART_V2_SHELL } from './City01ArtV2ShellContract';

describe('City01 Art V2 shell', () => {
  it('keeps one stable CSS scope and major version', () => {
    expect(CITY01_ART_V2_SHELL.scope).toBe('city01-art-v2-foundation-1');
    expect(CITY01_ART_V2_SHELL.majorVersion).toBe('2');
    expect(CITY01_ART_V2_SHELL.stylesheet).toBe('./ui/city01-art-v2.css');
  });

  it('must load after the legacy shell rather than competing with it', () => {
    expect(CITY01_ART_V2_SHELL.loadAfterLegacyShell).toBe(true);
  });

  it('owns every high-level player-facing surface', () => {
    expect(CITY01_ART_V2_SHELL.owns).toEqual([
      'world-atmosphere',
      'top-command-bar',
      'mission-guidance',
      'tool-rail',
      'build-dock',
      'drawer-surfaces'
    ]);
  });

  it('keeps mobile safe-area and reduced-motion contracts', () => {
    expect(CITY01_ART_V2_SHELL.responsive.safeArea).toBe(true);
    expect(CITY01_ART_V2_SHELL.responsive.mobilePortrait).toBe(true);
    expect(CITY01_ART_V2_SHELL.responsive.reducedMotion).toBe(true);
  });
});
