import { AssetManager } from '../resources/AssetManager';
import type { EdgeRuntimeState, NodeRuntimeState, PowerNodeConfig } from './types';

const assetUrl = (id: string): string => AssetManager.get(id, '');

export interface BattleSpriteSpec {
  url: string;
  width: number;
  height: number;
  baselineOffset: number;
  cardX: number;
  cardY: number;
  variant?: string;
}

const sprite = (
  id: string,
  width: number,
  height: number,
  cardX: number,
  cardY: number,
  baselineOffset = 1.1,
  variant?: string
): BattleSpriteSpec => ({
  url: assetUrl(id), width, height, cardX, cardY, baselineOffset, variant
});

const isPowered = (runtime: NodeRuntimeState, config: PowerNodeConfig): boolean =>
  runtime.operatingState === 'online' && ((config.demandMw ?? 0) <= 0 || runtime.powerPercent >= 98);

export const facilitySpriteFor = (
  config: PowerNodeConfig,
  runtime: NodeRuntimeState,
  batteryDischarging = false
): BattleSpriteSpec | undefined => {
  if (config.id === 'spawn-east') {
    return sprite('griddef_rifts_east_rift_left', 10.5, 14.8, -1, -13.6, 1.1, 'rift');
  }
  if (config.id === 'spawn-north') {
    return sprite('griddef_rifts_north_rift_down', 11.4, 14.4, -1, -13.2, 1.1, 'rift');
  }

  const powered = isPowered(runtime, config);
  switch (config.kind) {
    case 'generator':
      return sprite('griddef_buildings_power_plant', 15.2, 11.3, 6.5, -10.3, 1.15, 'generator');
    case 'substation':
      return sprite('griddef_buildings_substation_hub', 15.4, 10.5, 6.6, -9.5, 1.1, 'substation');
    case 'hospital':
      return powered
        ? sprite('griddef_states_hospital_powered', 15.5, 11.2, 6.8, -10.2, 1.15, 'hospital-powered')
        : sprite('griddef_states_hospital_blackout', 15.5, 10.8, 6.8, -9.8, 1.15, 'hospital-blackout');
    case 'residential':
      return powered
        ? sprite('griddef_states_residential_powered', 15.6, 10.7, 6.9, -9.7, 1.1, 'residential-powered')
        : sprite('griddef_states_residential_blackout', 15.2, 10.7, 6.8, -9.7, 1.1, 'residential-blackout');
    case 'commercial':
      return powered
        ? sprite('griddef_states_mall_powered', 15.4, 10.7, 6.8, -9.7, 1.1, 'commercial-powered')
        : sprite('griddef_states_mall_blackout', 14.8, 10.7, 6.6, -9.7, 1.1, 'commercial-blackout');
    case 'industrial':
      return powered
        ? sprite('griddef_states_industrial_powered', 16.2, 8.6, 7, -7.6, 1.05, 'industrial-powered')
        : sprite('griddef_states_industrial_blackout', 16.2, 8.4, 7, -7.4, 1.05, 'industrial-blackout');
    case 'battery':
      return batteryDischarging
        ? sprite('griddef_states_battery_discharging', 16.2, 8.6, 7, -7.6, 1.05, 'battery-discharging')
        : sprite('griddef_states_battery_charging', 14.8, 9.2, 6.6, -8.2, 1.05, 'battery-charging');
    case 'junction':
      return sprite('griddef_grid_nodes_normal_node', 6.5, 5.1, 3.4, -4.6, 0.65, 'junction');
    default:
      return undefined;
  }
};

export type MonsterVisualState = 'walk' | 'hit' | 'stunned' | 'break-armor' | 'roar' | 'death';

export interface MonsterSpriteSpec {
  url: string;
  width: number;
  height: number;
  hpY: number;
  state: MonsterVisualState;
}

const monsterSprite = (
  id: string,
  width: number,
  height: number,
  hpY: number,
  state: MonsterVisualState
): MonsterSpriteSpec => ({ url: assetUrl(id), width, height, hpY, state });

export const monsterSpriteFor = (archetypeId: string, state: MonsterVisualState = 'walk'): MonsterSpriteSpec | undefined => {
  if (archetypeId === 'crawler') {
    if (state === 'death') return monsterSprite('griddef_monsters_small_death', 5.8, 4.1, -4.2, state);
    if (state === 'stunned') return monsterSprite('griddef_monsters_small_electro_stun', 6.2, 4.5, -4.6, state);
    if (state === 'hit') return monsterSprite('griddef_monsters_small_hit', 5.6, 4.2, -4.3, state);
    return monsterSprite('griddef_monsters_small_walk', 5.6, 4.2, -4.3, 'walk');
  }
  if (archetypeId === 'brute') {
    if (state === 'death') return monsterSprite('griddef_monsters_armored_death', 7.5, 5.4, -5.5, state);
    if (state === 'break-armor' || state === 'stunned') return monsterSprite('griddef_monsters_armored_break_armor', 7.1, 5.8, -5.9, 'break-armor');
    if (state === 'hit') return monsterSprite('griddef_monsters_armored_hit', 7.1, 5.8, -5.9, state);
    return monsterSprite('griddef_monsters_armored_walk', 7.1, 5.8, -5.9, 'walk');
  }
  if (archetypeId === 'boss') {
    if (state === 'death') return monsterSprite('griddef_monsters_boss_death', 10.5, 6.7, -6.9, state);
    if (state === 'roar') return monsterSprite('griddef_monsters_boss_roar', 10.2, 8.0, -8.2, state);
    if (state === 'hit' || state === 'stunned' || state === 'break-armor') return monsterSprite('griddef_monsters_boss_hit', 10.2, 7.7, -7.9, 'hit');
    return monsterSprite('griddef_monsters_boss_walk', 10.2, 7.7, -7.9, 'walk');
  }
  return undefined;
};

export interface BattleOverlaySpec {
  url: string;
  width: number;
  height: number;
  variant: string;
}

export const edgeOverlayFor = (edge: EdgeRuntimeState): BattleOverlaySpec | undefined => {
  if (edge.operatingState === 'broken' || edge.loadState === 'broken') {
    return { url: assetUrl('griddef_effects_line_damage'), width: 10.5, height: 5.8, variant: 'broken' };
  }
  if (edge.operatingState === 'offline') {
    return { url: assetUrl('griddef_grid_nodes_line_off'), width: 11.5, height: 5.8, variant: 'offline' };
  }
  if (edge.loadState === 'overload') {
    return { url: assetUrl('griddef_effects_overload_charge'), width: 9.8, height: 5.8, variant: 'overload' };
  }
  if (edge.loadState === 'high') {
    return { url: assetUrl('griddef_effects_line_overheat'), width: 10.2, height: 5.8, variant: 'high' };
  }
  return undefined;
};

export const monsterDeathEffectUrl = assetUrl('griddef_effects_monster_death_effect');
export const batteryDischargeEffectUrl = assetUrl('griddef_effects_battery_discharge_effect');
export const overloadNodeSpriteUrl = assetUrl('griddef_effects_impact_electric');

export const BATTLE_UI_ASSETS = {
  closeZone: assetUrl('griddef_ui_close_zone'),
  switchRoute: assetUrl('griddef_ui_switch_route'),
  forceOverload: assetUrl('griddef_ui_force_overload'),
  pause: assetUrl('griddef_ui_pause'),
  restart: assetUrl('griddef_ui_restart'),
  nextWave: assetUrl('griddef_ui_next_wave'),
  waveStart: assetUrl('griddef_ui_wave_start'),
  bossIncoming: assetUrl('griddef_ui_boss_incoming'),
  hospitalAlarm: assetUrl('griddef_ui_hospital_alarm'),
  victory: assetUrl('griddef_ui_victory_panel'),
  defeat: assetUrl('griddef_ui_defeat_panel')
} as const;

const PRELOAD_IDS = [
  'griddef_buildings_power_plant',
  'griddef_buildings_substation_hub',
  'griddef_grid_nodes_normal_node',
  'griddef_grid_nodes_line_off',
  'griddef_effects_line_overheat',
  'griddef_effects_overload_charge',
  'griddef_effects_impact_electric',
  'griddef_effects_monster_death_effect',
  'griddef_effects_battery_discharge_effect',
  'griddef_rifts_east_rift_left',
  'griddef_rifts_north_rift_down',
  'griddef_states_hospital_powered',
  'griddef_states_hospital_blackout',
  'griddef_states_residential_powered',
  'griddef_states_residential_blackout',
  'griddef_states_mall_powered',
  'griddef_states_mall_blackout',
  'griddef_states_industrial_powered',
  'griddef_states_industrial_blackout',
  'griddef_states_battery_charging',
  'griddef_states_battery_discharging',
  'griddef_monsters_small_walk',
  'griddef_monsters_small_hit',
  'griddef_monsters_small_electro_stun',
  'griddef_monsters_small_death',
  'griddef_monsters_armored_walk',
  'griddef_monsters_armored_hit',
  'griddef_monsters_armored_break_armor',
  'griddef_monsters_armored_death',
  'griddef_monsters_boss_walk',
  'griddef_monsters_boss_hit',
  'griddef_monsters_boss_roar',
  'griddef_monsters_boss_death',
  'griddef_ui_close_zone',
  'griddef_ui_switch_route',
  'griddef_ui_force_overload',
  'griddef_ui_pause',
  'griddef_ui_restart',
  'griddef_ui_next_wave',
  'griddef_ui_wave_start',
  'griddef_ui_boss_incoming',
  'griddef_ui_hospital_alarm',
  'griddef_ui_victory_panel',
  'griddef_ui_defeat_panel'
] as const;

export const BATTLE_ASSET_URLS = PRELOAD_IDS
  .map((id) => assetUrl(id))
  .filter((url): url is string => Boolean(url));
