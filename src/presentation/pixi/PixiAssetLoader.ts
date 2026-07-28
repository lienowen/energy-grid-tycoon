import { Assets, Texture } from 'pixi.js';
import { AssetManager } from '../../resources/AssetManager';
import {
  createCity01DistrictRuntimeTexture,
  isCity01DistrictRuntimeAsset
} from './City01DistrictTextureFactory';
import {
  city01RuntimeTextureKind,
  createCity01RuntimeTexture
} from './City01RuntimeTextureFactory';

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

    const request = (
      isCity01DistrictRuntimeAsset(assetId)
        ? createCity01DistrictRuntimeTexture(assetId, source)
        : city01RuntimeTextureKind(assetId)
          ? createCity01RuntimeTexture(assetId, source)
          : Assets.load<Texture>({ alias: assetId, src: source })
    ).catch((error: unknown) => {
      console.warn(`Pixi texture failed to load: ${assetId}`, error);
      return undefined;
    });
    this.requests.set(assetId, request);
    return request;
  }
}
