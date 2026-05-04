/**
 * @file event-emitter.ts
 * Lightweight, strongly-typed publish/subscribe bus.
 * No RxJS – pure browser-native pattern.
 *
 * Usage:
 *   const emitter = new TypedEventEmitter<MyEventMap>();
 *   const unsub = emitter.on('annotationAdded', handler);
 *   emitter.emit('annotationAdded', annotation);
 *   unsub(); // remove listener
 */

export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

/** Map of event-name → payload type */
export type EventMap = Record<string, unknown>;

export class TypedEventEmitter<TMap extends EventMap> {
  private readonly listeners = new Map<keyof TMap, Set<Listener<TMap[keyof TMap]>>>();

  on<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): Unsubscribe {
    let set = this.listeners.get(event) as Set<Listener<TMap[K]>> | undefined;
    if (!set) {
      set = new Set();
      this.listeners.set(event, set as Set<Listener<TMap[keyof TMap]>>);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  once<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): Unsubscribe {
    const unsub = this.on(event, (payload: TMap[K]) => {
      listener(payload);
      unsub();
    });
    return unsub;
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const set = this.listeners.get(event) as Set<Listener<TMap[K]>> | undefined;
    if (!set) return;
    // Snapshot to avoid mutation during iteration
    for (const fn of [...set]) {
      fn(payload);
    }
  }

  off<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): void {
    const set = this.listeners.get(event) as Set<Listener<TMap[K]>> | undefined;
    set?.delete(listener);
  }

  removeAllListeners(event?: keyof TMap): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
