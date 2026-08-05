import type { PowerNodeConfig } from './types';

const BATTERY_STORAGE_URL = '/assets/battle/battery_storage.png';
const ELECTRIC_BEAST_LARGE_URL = '/assets/battle/electric_beast_large.png';
const ELECTRIC_BEAST_SMALL_URL = '/assets/battle/electric_beast_small.png';
const HOSPITAL_URL = '/assets/battle/hospital.png';
const INDUSTRIAL_ZONE_URL = '/assets/battle/industrial_zone.png';
const POWER_NODE_OVERLOAD_URL = '/assets/battle/power_node_overload.png';
const RESIDENTIAL_URL = '/assets/battle/residential.png';
const SHOPPING_MALL_URL = '/assets/battle/shopping_mall.png';

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
    url: HOSPITAL_URL,
    width: 19,
    height: 12.7,
    baselineOffset: 1.25,
    cardX: 6.5,
    cardY: -11.4
  },
  residential: {
    url: RESIDENTIAL_URL,
    width: 20,
    height: 13.3,
    baselineOffset: 1.25,
    cardX: 6.8,
    cardY: -11.8
  },
  commercial: {
    url: SHOPPING_MALL_URL,
    width: 18,
    height: 12,
    baselineOffset: 1.2,
    cardX: 6.2,
    cardY: -10.7
  },
  battery: {
    url: BATTERY_STORAGE_URL,
    width: 18.5,
    height: 12.3,
    baselineOffset: 1.2,
    cardX: 6.3,
    cardY: -11
  },
  industrial: {
    url: INDUSTRIAL_ZONE_URL,
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
  crawler: { url: ELECTRIC_BEAST_SMALL_URL, width: 8.2, height: 5.5, hpY: -5.25 },
  brute: { url: ELECTRIC_BEAST_LARGE_URL, width: 10.5, height: 7, hpY: -6.7 },
  boss: { url: ELECTRIC_BEAST_LARGE_URL, width: 15.5, height: 10.3, hpY: -10 }
};

export const facilitySpriteFor = (kind: PowerNodeConfig['kind']): BattleSpriteSpec | undefined => FACILITY_SPRITES[kind];
export const monsterSpriteFor = (archetypeId: string): MonsterSpriteSpec | undefined => MONSTER_SPRITES[archetypeId];
export const overloadNodeSpriteUrl = POWER_NODE_OVERLOAD_URL;

export const BATTLE_ASSET_URLS = [
  BATTERY_STORAGE_URL,
  ELECTRIC_BEAST_LARGE_URL,
  ELECTRIC_BEAST_SMALL_URL,
  HOSPITAL_URL,
  INDUSTRIAL_ZONE_URL,
  POWER_NODE_OVERLOAD_URL,
  RESIDENTIAL_URL,
  SHOPPING_MALL_URL
] as const;
