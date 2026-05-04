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
export class TypedEventEmitter {
    listeners = new Map();
    on(event, listener) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(listener);
        return () => set.delete(listener);
    }
    once(event, listener) {
        const unsub = this.on(event, (payload) => {
            listener(payload);
            unsub();
        });
        return unsub;
    }
    emit(event, payload) {
        const set = this.listeners.get(event);
        if (!set)
            return;
        // Snapshot to avoid mutation during iteration
        for (const fn of [...set]) {
            fn(payload);
        }
    }
    off(event, listener) {
        const set = this.listeners.get(event);
        set?.delete(listener);
    }
    removeAllListeners(event) {
        if (event !== undefined) {
            this.listeners.delete(event);
        }
        else {
            this.listeners.clear();
        }
    }
}
//# sourceMappingURL=event-emitter.js.map