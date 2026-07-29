import scopeFile from '../../product-scope.json';

interface ProductScopeFile {
  schemaVersion: number;
  mode: 'commercial-vertical-slice';
  releaseCityId: string;
  expansionFrozen: boolean;
  storeReady: boolean;
}

const scope = scopeFile as ProductScopeFile;

export const PRODUCT_SCOPE = Object.freeze({
  mode: scope.mode,
  releaseCityId: scope.releaseCityId,
  expansionFrozen: scope.expansionFrozen,
  storeReady: scope.storeReady
});

export const isReleaseCity = (levelId: string): boolean => levelId === PRODUCT_SCOPE.releaseCityId;

export const selectReleaseLevels = <T extends { id: string }>(levels: readonly T[]): T[] =>
  levels.filter((level) => isReleaseCity(level.id));
