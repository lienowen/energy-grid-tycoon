import type { AssetCatalog } from './AssetManager';

export const city01BattleAssetCatalog: AssetCatalog = {
  schemaVersion: 1,
  budgetBytes: 30_000_000,
  entries: [
    {
      id: 'battle_battery_storage',
      kind: 'image',
      src: '/assets/battle/battery_storage.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'facility', 'battery']
    },
    {
      id: 'battle_electric_beast_large',
      kind: 'image',
      src: '/assets/battle/electric_beast_large.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'monster', 'boss']
    },
    {
      id: 'battle_electric_beast_small',
      kind: 'image',
      src: '/assets/battle/electric_beast_small.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'monster']
    },
    {
      id: 'battle_hospital',
      kind: 'image',
      src: '/assets/battle/hospital.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'facility', 'critical']
    },
    {
      id: 'battle_industrial_zone',
      kind: 'image',
      src: '/assets/battle/industrial_zone.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'facility', 'industrial']
    },
    {
      id: 'battle_power_node_overload',
      kind: 'image',
      src: '/assets/battle/power_node_overload.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'grid', 'effect']
    },
    {
      id: 'battle_residential',
      kind: 'image',
      src: '/assets/battle/residential.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'facility', 'residential']
    },
    {
      id: 'battle_shopping_mall',
      kind: 'image',
      src: '/assets/battle/shopping_mall.png',
      version: 1,
      preload: 'lazy',
      width: 1536,
      height: 1024,
      tags: ['city01', 'battle', 'facility', 'commercial']
    }
  ]
};
