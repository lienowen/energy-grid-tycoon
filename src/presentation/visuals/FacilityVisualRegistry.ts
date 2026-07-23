import type { BuildingConfig } from '../../buildings/BuildingBase';

export type FacilityVisualFamily =
  | 'solar'
  | 'wind'
  | 'gas'
  | 'battery'
  | 'substation'
  | 'charging_hub'
  | 'nuclear'
  | 'hydro'
  | 'offshore_wind'
  | 'grid_node';

export type FacilityVisualState =
  | 'idle'
  | 'active'
  | 'overload'
  | 'offline'
  | 'construction'
  | 'upgrade'
  | 'selected'
  | 'damaged';

export interface FacilityVisualDescriptor {
  family: FacilityVisualFamily;
  state: FacilityVisualState;
  bodyAssetId: string;
  shadowAssetId: string;
  lightAssetId?: string;
  motionAssetId?: string;
  effectAssetId?: string;
}

export interface ResolveFacilityVisualInput {
  configId: string;
  category: BuildingConfig['category'];
  enabled: boolean;
  selected: boolean;
  constructionProgress: number;
}

const familyByConfigId = {
  solar_basic: 'solar',
  wind_basic: 'wind',
  gas_basic: 'gas',
  battery_basic: 'battery',
  battery_utility: 'battery',
  wind_offshore: 'offshore_wind',
  nuclear_advanced: 'nuclear'
} as const satisfies Readonly<Record<string, FacilityVisualFamily>>;

const resolveFamily = (
  configId: string,
  category: BuildingConfig['category']
): FacilityVisualFamily => {
  const registered = familyByConfigId[configId as keyof typeof familyByConfigId];
  if (registered) return registered;
  if (category === 'storage') return 'battery';
  if (category === 'grid') return 'grid_node';
  return 'grid_node';
};

const resolveState = (input: ResolveFacilityVisualInput): FacilityVisualState => {
  if (input.constructionProgress < 0.98) return 'construction';
  if (input.selected) return 'selected';
  return input.enabled ? 'active' : 'offline';
};

const assetId = (family: FacilityVisualFamily, suffix: string): string =>
  `world_facility_${family}_${suffix}`;

export class FacilityVisualRegistry {
  static resolve(input: ResolveFacilityVisualInput): FacilityVisualDescriptor {
    const family = resolveFamily(input.configId, input.category);
    const state = resolveState(input);
    const animated = input.enabled && state !== 'construction' && state !== 'offline';
    return {
      family,
      state,
      bodyAssetId: assetId(family, state),
      shadowAssetId: assetId(family, 'shadow'),
      lightAssetId: animated ? assetId(family, 'component_light') : undefined,
      motionAssetId: animated ? assetId(family, 'component_motion') : undefined,
      effectAssetId: animated ? assetId(family, 'component_effect') : undefined
    };
  }
}
