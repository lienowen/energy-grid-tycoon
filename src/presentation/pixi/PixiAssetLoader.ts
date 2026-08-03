import { Assets, Texture } from 'pixi.js';
import { AssetManager } from '../../resources/AssetManager';
import {
  createCity01DistrictRuntimeTexture,
  isCity01DistrictRuntimeAsset
} from './City01DistrictTextureFactory';
import {
  createCity01FacilityRuntimeTexture,
  isCity01FacilityRuntimeAsset
} from './City01FacilityTextureFactory';
import {
  createCity01FacilityV2Texture,
  isCity01FacilityV2Asset
} from './City01FacilityV2Generator';
import {
  createCity01GridRuntimeTexture,
  isCity01GridRuntimeAsset
} from './City01GridTextureFactory';
import {
  createCity01SupportRuntimeTexture,
  isCity01SupportRuntimeAsset
} from './City01SupportTextureFactory';
import {
  city01RuntimeTextureKind,
  createCity01RuntimeTexture
} from './City01RuntimeTextureFactory';

export class PixiAssetLoader {
  private readonly requests = new Map<string, Promise<Texture | undefined>>();

  load(assetId: string): Promise<Texture | undefined> {
    const existing = this.requests.get(assetId);
    if (existing) return existing;

    if (isCity01FacilityV2Asset(assetId)) {
      const generated = Promise.resolve(createCity01FacilityV2Texture(assetId));
      this.requests.set(assetId, generated);
      return generated;
    }

    const source = AssetManager.get(assetId, '');
    if (!source || !source.startsWith('/')) {
      const missing = Promise.resolve(undefined);
      this.requests.set(assetId, missing);
      return missing;
    }

    const request = (
      isCity01FacilityRuntimeAsset(assetId)
        ? createCity01FacilityRuntimeTexture(assetId, source)
        : isCity01GridRuntimeAsset(assetId)
          ? createCity01GridRuntimeTexture(assetId, source)
          : isCity01SupportRuntimeAsset(assetId)
            ? createCity01SupportRuntimeTexture(assetId, source)
            : isCity01DistrictRuntimeAsset(assetId)
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
