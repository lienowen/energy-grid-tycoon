export const CITY01_ART_V2_SHELL = {
  scope: 'city01-art-v2-foundation-1',
  majorVersion: '2',
  stylesheet: './ui/city01-art-v2.css',
  loadAfterLegacyShell: true,
  owns: [
    'world-atmosphere',
    'top-command-bar',
    'mission-guidance',
    'tool-rail',
    'build-dock',
    'drawer-surfaces'
  ],
  responsive: {
    safeArea: true,
    mobilePortrait: true,
    reducedMotion: true
  }
} as const;

export type City01ArtV2ShellContract = typeof CITY01_ART_V2_SHELL;
