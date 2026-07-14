/**
 * @file annotation-store.ts
 * In-memory, observable store for annotation data.
 *
 * Design:
 * - Annotations are keyed by id within a page map.
 * - All mutations emit typed events that the renderer and Angular
 *   layer subscribe to for partial updates.
 * - The store never modifies annotation objects in place;
 *   it always replaces them to preserve immutability.
 */
import { TypedEventEmitter } from '../events/event-emitter.js';
// ─── Store ────────────────────────────────────────────────────────────────────
export class AnnotationStore {
    /** page index → ordered list of annotation ids (draw order) */
    pageOrder = new Map();
    /** id → annotation */
    map = new Map();
    emitter = new TypedEventEmitter();
    _docId = '';
    // ─── Lifecycle ─────────────────────────────────────────────────────────
    get docId() { return this._docId; }
    /** Replace all store contents with a new document */
    loadDocument(docId, annotations) {
        this.map.clear();
        this.pageOrder.clear();
        this._docId = docId;
        for (const a of annotations) {
            this.map.set(a.id, a);
            this.ensurePage(a.pageIndex).push(a.id);
        }
        this.emitter.emit('reset', { docId });
    }
    clear(docId) {
        this.map.clear();
        this.pageOrder.clear();
        this._docId = docId;
        this.emitter.emit('reset', { docId });
    }
    // ─── Mutations ──────────────────────────────────────────────────────────
    add(annotation) {
        if (this.map.has(annotation.id)) {
            throw new Error(`AnnotationStore.add: id "${annotation.id}" already exists`);
        }
        this.map.set(annotation.id, annotation);
        this.ensurePage(annotation.pageIndex).push(annotation.id);
        this.emitter.emit('add', { annotation });
    }
    remove(id) {
        const annotation = this.map.get(id);
        if (!annotation)
            return;
        this.map.delete(id);
        const order = this.pageOrder.get(annotation.pageIndex);
        if (order) {
            const idx = order.indexOf(id);
            if (idx !== -1)
                order.splice(idx, 1);
        }
        this.emitter.emit('remove', { id, pageIndex: annotation.pageIndex });
    }
    /**
     * Update specific fields of an annotation.
     * Prefer replace() when you have the full new object.
     */
    update(id, patch) {
        const current = this.map.get(id);
        if (!current)
            return;
        const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
        this.map.set(id, updated);
        this.emitter.emit('update', { annotation: updated, previous: current });
    }
    /** Replace an annotation entirely (used by undo/redo) */
    replace(annotation) {
        const previous = this.map.get(annotation.id);
        if (!previous) {
            // Re-add if it was removed
            this.add(annotation);
            return;
        }
        if (previous.pageIndex !== annotation.pageIndex) {
            // Page changed – update order maps
            const oldOrder = this.pageOrder.get(previous.pageIndex);
            if (oldOrder) {
                const idx = oldOrder.indexOf(annotation.id);
                if (idx !== -1)
                    oldOrder.splice(idx, 1);
            }
            this.ensurePage(annotation.pageIndex).push(annotation.id);
        }
        this.map.set(annotation.id, annotation);
        this.emitter.emit('update', { annotation, previous });
    }
    // ─── Queries ────────────────────────────────────────────────────────────
    getById(id) {
        return this.map.get(id);
    }
    getByPage(pageIndex) {
        const order = this.pageOrder.get(pageIndex);
        if (!order)
            return [];
        return order
            .map(id => this.map.get(id))
            .filter((a) => a !== undefined);
    }
    getAll() {
        return [...this.map.values()];
    }
    getPageIndices() {
        return [...this.pageOrder.keys()].sort((a, b) => a - b);
    }
    get size() { return this.map.size; }
    // ─── Events ─────────────────────────────────────────────────────────────
    on(event, listener) {
        return this.emitter.on(event, listener);
    }
    // ─── Private ────────────────────────────────────────────────────────────
    ensurePage(pageIndex) {
        let order = this.pageOrder.get(pageIndex);
        if (!order) {
            order = [];
            this.pageOrder.set(pageIndex, order);
        }
        return order;
    }
}
//# sourceMappingURL=annotation-store.js.map