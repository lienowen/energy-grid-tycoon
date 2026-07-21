export interface DomainEvent<K extends string = string, P = unknown> {
  type: K;
  payload: P;
  sequence: number;
}

export type DomainEventUnion<TEventMap extends object> = {
  [K in keyof TEventMap & string]: DomainEvent<K, TEventMap[K]>;
}[keyof TEventMap & string];

type EventListener<TEventMap extends object, K extends keyof TEventMap & string> = (
  event: DomainEvent<K, TEventMap[K]>
) => void;

type AnyEventListener<TEventMap extends object> = (
  event: DomainEventUnion<TEventMap>
) => void;

export class DomainEventBus<TEventMap extends object> {
  private readonly listeners = new Map<keyof TEventMap & string, Set<(event: never) => void>>();
  private readonly anyListeners = new Set<AnyEventListener<TEventMap>>();
  private sequence = 0;

  on<K extends keyof TEventMap & string>(type: K, listener: EventListener<TEventMap, K>): () => void {
    const bucket = this.listeners.get(type) ?? new Set<(event: never) => void>();
    bucket.add(listener as (event: never) => void);
    this.listeners.set(type, bucket);
    return () => bucket.delete(listener as (event: never) => void);
  }

  onAny(listener: AnyEventListener<TEventMap>): () => void {
    this.anyListeners.add(listener);
    return () => this.anyListeners.delete(listener);
  }

  emit<K extends keyof TEventMap & string>(type: K, payload: TEventMap[K]): DomainEvent<K, TEventMap[K]> {
    const event: DomainEvent<K, TEventMap[K]> = {
      type,
      payload,
      sequence: ++this.sequence
    };

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as never);
    }
    for (const listener of this.anyListeners) {
      listener(event as DomainEventUnion<TEventMap>);
    }
    return event;
  }

  clear(): void {
    this.listeners.clear();
    this.anyListeners.clear();
  }
}
