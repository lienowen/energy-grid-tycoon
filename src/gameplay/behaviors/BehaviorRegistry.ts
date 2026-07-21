import type { RuleContext, RuleEvaluation } from '../../rules/RuleTypes';

export type BehaviorParams = Record<string, number | string | boolean>;

export interface BehaviorHandler {
  readonly id: string;
  evaluate(params: BehaviorParams, context: RuleContext): RuleEvaluation;
}

export class BehaviorRegistry {
  private readonly handlers = new Map<string, BehaviorHandler>();

  register(handler: BehaviorHandler): this {
    if (this.handlers.has(handler.id)) {
      throw new Error(`Behavior already registered: ${handler.id}`);
    }
    this.handlers.set(handler.id, handler);
    return this;
  }

  has(id: string): boolean {
    return this.handlers.has(id);
  }

  ids(): string[] {
    return [...this.handlers.keys()];
  }

  evaluate(id: string, params: BehaviorParams, context: RuleContext): RuleEvaluation {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error(`Unknown behavior: ${id}`);
    return handler.evaluate(params, context);
  }
}
