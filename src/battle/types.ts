export type PowerNodeId = string;
export type PowerEdgeId = string;

export type FacilityKind =
  | 'generator'
  | 'substation'
  | 'battery'
  | 'hospital'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'junction';

export type NodeOperatingState = 'online' | 'offline';
export type EdgeOperatingState = 'online' | 'offline' | 'broken';
export type LineLoadState = 'normal' | 'high' | 'overload' | 'broken';
export type BattleStatus = 'ready' | 'running' | 'victory' | 'defeat' | 'paused';

export interface PowerNodeConfig {
  id: PowerNodeId;
  label: string;
  kind: FacilityKind;
  x: number;
  y: number;
  demandMw?: number;
  supplyMw?: number;
  batteryCapacityMwh?: number;
  batteryInitialMwh?: number;
  batteryMaxDischargeMw?: number;
  batteryMaxChargeMw?: number;
  priority?: number;
  criticalOutageLimitSeconds?: number;
  lockedOnline?: boolean;
}

export interface PowerEdgeConfig {
  id: PowerEdgeId;
  from: PowerNodeId;
  to: PowerNodeId;
  capacityMw: number;
  length?: number;
  switchable?: boolean;
}

export interface MonsterArchetype {
  id: string;
  label: string;
  maxHp: number;
  speed: number;
  drainMw: number;
  overloadDamageMultiplier?: number;
  radius?: number;
}

export interface WaveSpawnConfig {
  archetypeId: string;
  count: number;
  intervalSeconds: number;
  spawnNodeId: PowerNodeId;
  targetNodeId: PowerNodeId;
  initialDelaySeconds?: number;
}

export interface WaveConfig {
  id: string;
  label: string;
  startsAtSeconds: number;
  spawns: WaveSpawnConfig[];
}

export interface BattleLevelConfig {
  id: string;
  name: string;
  subtitle: string;
  nodes: PowerNodeConfig[];
  edges: PowerEdgeConfig[];
  monsters: MonsterArchetype[];
  waves: WaveConfig[];
  overloadDurationSeconds: number;
  overloadDamagePerSecond: number;
  overloadEnergyCostMwh: number;
  overloadCooldownSeconds: number;
  overloadHeatGainPercent: number;
  lineHeatCoolPerSecond: number;
  lineRepairSeconds: number;
  bossAbilityDelaySeconds: number;
  bossAbilityCooldownSeconds: number;
  bossRouteLockSeconds: number;
}

export interface NodeRuntimeState {
  id: PowerNodeId;
  operatingState: NodeOperatingState;
  requestedMw: number;
  allocatedMw: number;
  powerPercent: number;
  outageSeconds: number;
  batteryEnergyMwh: number;
}

export interface EdgeRuntimeState {
  id: PowerEdgeId;
  operatingState: EdgeOperatingState;
  loadMw: number;
  loadPercent: number;
  loadState: LineLoadState;
  overloadRemainingSeconds: number;
  overloadCooldownRemainingSeconds: number;
  heatPercent: number;
  repairRemainingSeconds: number;
  bossLockRemainingSeconds: number;
}

export interface MonsterRuntimeState {
  id: string;
  archetypeId: string;
  hp: number;
  maxHp: number;
  spawnNodeId: PowerNodeId;
  targetNodeId: PowerNodeId;
  currentNodeId: PowerNodeId;
  nextNodeId?: PowerNodeId;
  currentEdgeId?: PowerEdgeId;
  progress: number;
  path: PowerNodeId[];
  reachedTarget: boolean;
  alive: boolean;
  defeatedAtSeconds?: number;
  abilityCooldownRemainingSeconds?: number;
  abilityActiveUntilSeconds?: number;
}

export interface BattleSnapshot {
  levelId: string;
  status: BattleStatus;
  elapsedSeconds: number;
  currentWaveIndex: number;
  totalWaves: number;
  nextWaveInSeconds: number;
  totalSupplyMw: number;
  totalDemandMw: number;
  totalAllocatedMw: number;
  batteryEnergyMwh: number;
  batteryCapacityMwh: number;
  criticalOutageSeconds: number;
  criticalOutageLimitSeconds: number;
  nodes: NodeRuntimeState[];
  edges: EdgeRuntimeState[];
  monsters: MonsterRuntimeState[];
  message: string;
}

export interface BattleActionResult {
  ok: boolean;
  message: string;
}
