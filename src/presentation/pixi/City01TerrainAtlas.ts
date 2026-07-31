import { Assets, Spritesheet, type Texture } from 'pixi.js';
import atlasData from '../../../source/city01/terrain-tileset-v1/atlas/terrain_coast_v1.json';

const atlasImageUrl = new URL(
  '../../../source/city01/terrain-tileset-v1/atlas/terrain_coast_v1.png',
  import.meta.url
).href;

export class City01TerrainAtlas {
  private static textures?: Record<string, Texture>;
  private static loading?: Promise<Record<string, Texture>>;

  static isReady(): boolean {
    return Boolean(City01TerrainAtlas.textures);
  }

  static getTexture(frameName: string): Texture | undefined {
    return City01TerrainAtlas.textures?.[frameName];
  }

  static load(): Promise<Record<string, Texture>> {
    if (City01TerrainAtlas.textures) {
      return Promise.resolve(City01TerrainAtlas.textures);
    }
    if (City01TerrainAtlas.loading) return City01TerrainAtlas.loading;

    City01TerrainAtlas.loading = (async () => {
      const atlasTexture = await Assets.load<Texture>(atlasImageUrl);
      const sheet = new Spritesheet(atlasTexture, atlasData);
      await sheet.parse();
      City01TerrainAtlas.textures = sheet.textures;
      return sheet.textures;
    })().catch((error: unknown) => {
      City01TerrainAtlas.loading = undefined;
      throw error;
    });

    return City01TerrainAtlas.loading;
  }
}
