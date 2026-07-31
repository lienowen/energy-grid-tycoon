import { describe, expect, it } from 'vitest';
import mapperSource from '../CitySceneMapper.ts?raw';
import terrainRegistrySource from '../world-grid/City01TerrainTileRegistry.ts?raw';
import rendererSource from './City01IntegratedPixiWorld.ts?raw';
import tilemapRendererSource from './City01TilemapRenderer.ts?raw';
import terrainAtlasSource from './City01TerrainAtlas.ts?raw';
import { CitySceneMapper } from '../CitySceneMapper';

describe('City-01 tile-world architecture', () => {
  it('uses mapped tile-world state for normal runtime rendering', () => {
    expect(rendererSource).toContain('City01TilemapRenderer.render');
    expect(rendererSource).toContain("state.tileWorld ? 'tile-world' : 'legacy-fallback'");
    expect(rendererSource).not.toContain('drawIslandBase');
    expect(rendererSource).not.toContain('buildCity01AccessRoads');
  });

  it('keeps the legacy authored background behind showcase mode only', () => {
    expect(rendererSource).toContain("if (mode === 'showcase')");
    expect(rendererSource).toContain("this.drawMapComposition(generation, 'showcase')");
  });

  it('constructs the tile matrix in the mapper rather than the renderer', () => {
    expect(mapperSource).toContain('TileWorldBuilder.build(layout.worldGrid)');
    expect(rendererSource).not.toContain('LevelSceneLayoutRegistry');
    expect(CitySceneMapper).toBeDefined();
  });

  it('renders terrain through the 47-tile atlas instead of procedural coast lines', () => {
    expect(tilemapRendererSource).toContain('City01TerrainAtlas.load');
    expect(tilemapRendererSource).toContain('resolveCity01TerrainFrame');
    expect(tilemapRendererSource).toContain('resolveCity01WaterFrame');
    expect(tilemapRendererSource).not.toContain('drawShoreline');
    expect(tilemapRendererSource).not.toContain('drawCoastEdge');
    expect(terrainAtlasSource).toContain('terrain_coast_v1.png');
    expect(terrainAtlasSource).toContain('new Spritesheet');
  });

  it('uses stable center materials instead of random per-cell terrain frames', () => {
    expect(terrainRegistrySource).toContain("'terrain_grass_00'");
    expect(terrainRegistrySource).toContain("'terrain_water_00'");
    expect(terrainRegistrySource).not.toContain('variationSuffix');
  });
});
