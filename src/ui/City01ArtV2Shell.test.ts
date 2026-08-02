import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
const artV2Css = readFileSync(new URL('./city01-art-v2.css', import.meta.url), 'utf8');

describe('City01 Art V2 shell', () => {
  it('loads the Art V2 stylesheet after legacy shell styles', () => {
    const legacyIndex = mainSource.indexOf("import './ui/game-shell.css'");
    const artV2Index = mainSource.indexOf("import './ui/city01-art-v2.css'");

    expect(legacyIndex).toBeGreaterThanOrEqual(0);
    expect(artV2Index).toBeGreaterThan(legacyIndex);
  });

  it('publishes a versioned runtime marker before the game mounts', () => {
    expect(mainSource).toContain('document.documentElement.dataset.artDirection = CITY01_ART_V2.revision');
    expect(mainSource).toContain("document.documentElement.dataset.artVersion = '2'");
  });

  it('owns the world atmosphere, command bar, tool rail and build dock', () => {
    expect(artV2Css).toContain('.egt-world::before');
    expect(artV2Css).toContain('.egt-topbar');
    expect(artV2Css).toContain('.egt-dock');
    expect(artV2Css).toContain('.egt-buildbar::before');
    expect(artV2Css).toContain('.egt-card.selected');
  });

  it('keeps mobile safe-area and reduced-motion contracts', () => {
    expect(artV2Css).toContain('env(safe-area-inset-top)');
    expect(artV2Css).toContain('env(safe-area-inset-bottom)');
    expect(artV2Css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
