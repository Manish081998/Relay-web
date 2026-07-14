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
export declare class TypedEventEmitter<TMap extends EventMap> {
    private readonly listeners;
    on<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): Unsubscribe;
    once<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): Unsubscribe;
    emit<K extends keyof TMap>(event: K, payload: TMap[K]): void;
    off<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): void;
    removeAllListeners(event?: keyof TMap): void;
}
//# sourceMappingURL=event-emitter.d.ts.map