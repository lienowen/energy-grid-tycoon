import batteryStorageUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/battery_storage.png';
import electricBeastLargeUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/electric_beast_large.png';
import electricBeastSmallUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/electric_beast_small.png';
import hospitalUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/hospital.png';
import industrialZoneUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/industrial_zone.png';
import powerNodeOverloadUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/power_node_overload.png';
import residentialUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/residential.png';
import shoppingMallUrl from '../../source/city01/battle-assets-v1/energy_grid_battle_assets/shopping_mall.png';
import type { PowerNodeConfig } from './types';

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
    url: hospitalUrl,
    width: 19,
    height: 12.7,
    baselineOffset: 1.25,
    cardX: 6.5,
    cardY: -11.4
  },
  residential: {
    url: residentialUrl,
    width: 20,
    height: 13.3,
    baselineOffset: 1.25,
    cardX: 6.8,
    cardY: -11.8
  },
  commercial: {
    url: shoppingMallUrl,
    width: 18,
    height: 12,
    baselineOffset: 1.2,
    cardX: 6.2,
    cardY: -10.7
  },
  battery: {
    url: batteryStorageUrl,
    width: 18.5,
    height: 12.3,
    baselineOffset: 1.2,
    cardX: 6.3,
    cardY: -11
  },
  industrial: {
    url: industrialZoneUrl,
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
  crawler: { url: electricBeastSmallUrl, width: 8.2, height: 5.5, hpY: -5.25 },
  brute: { url: electricBeastLargeUrl, width: 10.5, height: 7, hpY: -6.7 },
  boss: { url: electricBeastLargeUrl, width: 15.5, height: 10.3, hpY: -10 }
};

export const facilitySpriteFor = (kind: PowerNodeConfig['kind']): BattleSpriteSpec | undefined => FACILITY_SPRITES[kind];
export const monsterSpriteFor = (archetypeId: string): MonsterSpriteSpec | undefined => MONSTER_SPRITES[archetypeId];
export const overloadNodeSpriteUrl = powerNodeOverloadUrl;

export const BATTLE_ASSET_URLS = [
  batteryStorageUrl,
  electricBeastLargeUrl,
  electricBeastSmallUrl,
  hospitalUrl,
  industrialZoneUrl,
  powerNodeOverloadUrl,
  residentialUrl,
  shoppingMallUrl
] as const;
