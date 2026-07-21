import type { DomainEventUnion } from './DomainEventBus';

export interface GameDomainEventMap {
  'building.completed': { configId: string; instanceId: string };
  'building.upgraded': { instanceId: string; level: number };
  'building.toggled': { instanceId: string; enabled: boolean };
  'technology.researched': { technologyId: string };
  'policy.changed': { policyId?: string };
  'event.started': { eventId: string; durationHours: number };
  'event.ended': { eventId: string };
  'grid.overloaded': { supplyRatio: number; supply: number; demand: number };
  'grid.stabilized': { supplyRatio: number };
  'rule.triggered': { ruleId: string; signal: string };
  'scenario.completed': { levelId: string; score: number };
  'scenario.failed': { levelId: string };
}

export type GameDomainEvent = DomainEventUnion<GameDomainEventMap>;
