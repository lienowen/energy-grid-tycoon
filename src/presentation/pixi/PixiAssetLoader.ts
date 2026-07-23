import { Assets, Texture } from 'pixi.js';
import { AssetManager } from '../../resources/AssetManager';

export class PixiAssetLoader {
  private readonly requests = new Map<string, Promise<Texture | undefined>>();

  load(assetId: string): Promise<Texture | undefined> {
    const existing = this.requests.get(assetId);
    if (existing) return existing;

    const source = AssetManager.get(assetId, '');
    if (!source || !source.startsWith('/')) {
      const missing = Promise.resolve(undefined);
      this.requests.set(assetId, missing);
      return missing;
    }

    const request = Assets.load<Texture>({ alias: assetId, src: source })
      .catch((error: unknown) => {
        console.warn(`Pixi texture failed to load: ${assetId}`, error);
        return undefined;
      });
    this.requests.set(assetId, request);
    return request;
  }
}
