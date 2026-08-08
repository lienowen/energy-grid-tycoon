import type { BattleLevelConfig } from '../types';

export const CITY01_SIEGE_LEVEL: BattleLevelConfig = {
  id: 'city01-electric-beast-siege',
  name: '噬电兽围城',
  subtitle: '用电力做武器，把怪物引入陷阱，守护医院。',
  overloadDurationSeconds: 3,
  overloadDamagePerSecond: 48,
  overloadEnergyCostMwh: 5,
  overloadCooldownSeconds: 8,
  overloadHeatGainPercent: 60,
  lineHeatCoolPerSecond: 5,
  lineRepairSeconds: 10,
  bossAbilityDelaySeconds: 4,
  bossAbilityCooldownSeconds: 12,
  bossRouteLockSeconds: 6,
  nodes: [
    { id: 'plant', label: '发电站', kind: 'generator', x: 11, y: 73, supplyMw: 180, lockedOnline: true },
    { id: 'west-junction', label: '西侧节点', kind: 'junction', x: 28, y: 55 },
    { id: 'hospital', label: '医院', kind: 'hospital', x: 19, y: 36, demandMw: 50, priority: 100, criticalOutageLimitSeconds: 60 },
    { id: 'residential', label: '住宅区', kind: 'residential', x: 43, y: 24, demandMw: 70, priority: 60 },
    { id: 'substation', label: '地铁站', kind: 'substation', x: 39, y: 62, demandMw: 45, priority: 50 },
    {
      id: 'battery', label: '储能站', kind: 'battery', x: 48, y: 75,
      batteryCapacityMwh: 80, batteryInitialMwh: 32,
      batteryMaxDischargeMw: 70, batteryMaxChargeMw: 40,
      lockedOnline: true
    },
    { id: 'center-junction', label: '中心节点', kind: 'junction', x: 54, y: 49 },
    { id: 'mall', label: '商场', kind: 'commercial', x: 68, y: 33, demandMw: 80, priority: 35 },
    { id: 'industrial', label: '工业区', kind: 'industrial', x: 68, y: 68, demandMw: 90, priority: 25 },
    { id: 'east-junction', label: '东侧节点', kind: 'junction', x: 82, y: 52 },
    { id: 'spawn-north', label: '北部裂隙', kind: 'junction', x: 92, y: 18, lockedOnline: true },
    { id: 'spawn-east', label: '东部裂隙', kind: 'junction', x: 96, y: 49, lockedOnline: true }
  ],
  edges: [
    { id: 'plant-west', from: 'plant', to: 'west-junction', capacityMw: 120 },
    { id: 'west-hospital', from: 'west-junction', to: 'hospital', capacityMw: 80 },
    { id: 'west-substation', from: 'west-junction', to: 'substation', capacityMw: 90 },
    { id: 'hospital-residential', from: 'hospital', to: 'residential', capacityMw: 80, switchable: true },
    { id: 'residential-center', from: 'residential', to: 'center-junction', capacityMw: 100 },
    { id: 'substation-center', from: 'substation', to: 'center-junction', capacityMw: 100, switchable: true },
    { id: 'substation-battery', from: 'substation', to: 'battery', capacityMw: 80 },
    { id: 'battery-industrial', from: 'battery', to: 'industrial', capacityMw: 100, switchable: true },
    { id: 'center-mall', from: 'center-junction', to: 'mall', capacityMw: 100 },
    { id: 'center-industrial', from: 'center-junction', to: 'industrial', capacityMw: 120, switchable: true },
    { id: 'mall-east', from: 'mall', to: 'east-junction', capacityMw: 90, switchable: true },
    { id: 'industrial-east', from: 'industrial', to: 'east-junction', capacityMw: 120 },
    { id: 'north-mall', from: 'spawn-north', to: 'mall', capacityMw: 90 },
    { id: 'north-east', from: 'spawn-north', to: 'east-junction', capacityMw: 70, switchable: true },
    { id: 'spawn-east-edge', from: 'spawn-east', to: 'east-junction', capacityMw: 120 }
  ],
  monsters: [
    { id: 'crawler', label: '噬电幼兽', maxHp: 90, speed: 9, drainMw: 8, overloadDamageMultiplier: 1.15, radius: 8 },
    { id: 'brute', label: '装甲噬电兽', maxHp: 190, speed: 6, drainMw: 14, overloadDamageMultiplier: 0.8, radius: 11 },
    { id: 'boss', label: '大型噬电兽', maxHp: 520, speed: 4.2, drainMw: 28, overloadDamageMultiplier: 0.65, radius: 16 }
  ],
  waves: [
    {
      id: 'wave-1', label: '侦察群', startsAtSeconds: 3,
      spawns: [{ archetypeId: 'crawler', count: 5, intervalSeconds: 2.5, spawnNodeId: 'spawn-east', targetNodeId: 'hospital' }]
    },
    {
      id: 'wave-2', label: '双向突袭', startsAtSeconds: 27,
      spawns: [
        { archetypeId: 'crawler', count: 5, intervalSeconds: 2.1, spawnNodeId: 'spawn-north', targetNodeId: 'hospital' },
        { archetypeId: 'brute', count: 3, intervalSeconds: 4.5, spawnNodeId: 'spawn-east', targetNodeId: 'hospital', initialDelaySeconds: 3 }
      ]
    },
    {
      id: 'wave-3', label: '兽王压境', startsAtSeconds: 65,
      spawns: [
        { archetypeId: 'brute', count: 4, intervalSeconds: 4, spawnNodeId: 'spawn-north', targetNodeId: 'hospital' },
        { archetypeId: 'boss', count: 1, intervalSeconds: 1, spawnNodeId: 'spawn-east', targetNodeId: 'hospital', initialDelaySeconds: 8 }
      ]
    }
  ]
};
