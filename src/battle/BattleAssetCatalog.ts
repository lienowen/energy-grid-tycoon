import { AssetManager } from '../resources/AssetManager';
import type { PowerNodeConfig } from './types';

const assetUrl = (id: string): string => AssetManager.get(id, '');

export interface BattleSpriteSpec {
  url: string;
  width: number;
  height: number;
  baselineOffset: number;
  cardX: number;
  cardY: number;
}

const FACILITY_SPRITES: Partial<Record<PowerNodeConfig['kind'], BattleSpriteSpec>> = {
  hospital: {
    url: assetUrl('battle_hospital'),
    width: 19,
    height: 12.7,
    baselineOffset: 1.25,
    cardX: 6.5,
    cardY: -11.4
  },
  residential: {
    url: assetUrl('battle_residential'),
    width: 20,
    height: 13.3,
    baselineOffset: 1.25,
    cardX: 6.8,
    cardY: -11.8
  },
  commercial: {
    url: assetUrl('battle_shopping_mall'),
    width: 18,
    height: 12,
    baselineOffset: 1.2,
    cardX: 6.2,
    cardY: -10.7
  },
  battery: {
    url: assetUrl('battle_battery_storage'),
    width: 18.5,
    height: 12.3,
    baselineOffset: 1.2,
    cardX: 6.3,
    cardY: -11
  },
  industrial: {
    url: assetUrl('battle_industrial_zone'),
    width: 19,
    height: 12.7,
    baselineOffset: 1.25,
    cardX: 6.5,
    cardY: -11.3
  }
};

export interface MonsterSpriteSpec {
  url: string;
  width: number;
  height: number;
  hpY: number;
}

const MONSTER_SPRITES: Record<string, MonsterSpriteSpec> = {
  crawler: { url: assetUrl('battle_electric_beast_small'), width: 8.2, height: 5.5, hpY: -5.25 },
  brute: { url: assetUrl('battle_electric_beast_large'), width: 10.5, height: 7, hpY: -6.7 },
  boss: { url: assetUrl('battle_electric_beast_large'), width: 15.5, height: 10.3, hpY: -10 }
};

export const facilitySpriteFor = (kind: PowerNodeConfig['kind']): BattleSpriteSpec | undefined => FACILITY_SPRITES[kind];
export const monsterSpriteFor = (archetypeId: string): MonsterSpriteSpec | undefined => MONSTER_SPRITES[archetypeId];
export const overloadNodeSpriteUrl = assetUrl('battle_power_node_overload');

export const BATTLE_ASSET_URLS = [
  assetUrl('battle_battery_storage'),
  assetUrl('battle_electric_beast_large'),
  assetUrl('battle_electric_beast_small'),
  assetUrl('battle_hospital'),
  assetUrl('battle_industrial_zone'),
  assetUrl('battle_power_node_overload'),
  assetUrl('battle_residential'),
  assetUrl('battle_shopping_mall')
].filter((url): url is string => Boolean(url));
