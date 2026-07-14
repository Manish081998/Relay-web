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

import type { Annotation } from '../model/annotation.model.js';
import type { EventMap } from '../events/event-emitter.js';
import { TypedEventEmitter } from '../events/event-emitter.js';

// ─── Store events ─────────────────────────────────────────────────────────────

export interface AnnotationStoreEvents extends EventMap {
  /** Emitted after any annotation is added */
  add: { annotation: Annotation };
  /** Emitted after an annotation is replaced (style/geometry update) */
  update: { annotation: Annotation; previous: Annotation };
  /** Emitted after an annotation is removed */
  remove: { id: string; pageIndex: number };
  /** Emitted when the entire store is replaced (import/clear) */
  reset: { docId: string };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export class AnnotationStore {
  /** page index → ordered list of annotation ids (draw order) */
  private readonly pageOrder = new Map<number, string[]>();
  /** id → annotation */
  private readonly map = new Map<string, Annotation>();
  private readonly emitter = new TypedEventEmitter<AnnotationStoreEvents>();
  private _docId = '';

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  get docId(): string { return this._docId; }

  /** Replace all store contents with a new document */
  loadDocument(docId: string, annotations: ReadonlyArray<Annotation>): void {
    this.map.clear();
    this.pageOrder.clear();
    this._docId = docId;
    for (const a of annotations) {
      this.map.set(a.id, a);
      this.ensurePage(a.pageIndex).push(a.id);
    }
    this.emitter.emit('reset', { docId });
  }

  clear(docId: string): void {
    this.map.clear();
    this.pageOrder.clear();
    this._docId = docId;
    this.emitter.emit('reset', { docId });
  }

  // ─── Mutations ──────────────────────────────────────────────────────────

  add(annotation: Annotation): void {
    if (this.map.has(annotation.id)) {
      throw new Error(`AnnotationStore.add: id "${annotation.id}" already exists`);
    }
    this.map.set(annotation.id, annotation);
    this.ensurePage(annotation.pageIndex).push(annotation.id);
    this.emitter.emit('add', { annotation });
  }

  remove(id: string): void {
    const annotation = this.map.get(id);
    if (!annotation) return;
    this.map.delete(id);
    const order = this.pageOrder.get(annotation.pageIndex);
    if (order) {
      const idx = order.indexOf(id);
      if (idx !== -1) order.splice(idx, 1);
    }
    this.emitter.emit('remove', { id, pageIndex: annotation.pageIndex });
  }

  /**
   * Update specific fields of an annotation.
   * Prefer replace() when you have the full new object.
   */
  update(id: string, patch: Partial<Annotation>): void {
    const current = this.map.get(id);
    if (!current) return;
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() } as Annotation;
    this.map.set(id, updated);
    this.emitter.emit('update', { annotation: updated, previous: current });
  }

  /** Replace an annotation entirely (used by undo/redo) */
  replace(annotation: Annotation): void {
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
        if (idx !== -1) oldOrder.splice(idx, 1);
      }
      this.ensurePage(annotation.pageIndex).push(annotation.id);
    }
    this.map.set(annotation.id, annotation);
    this.emitter.emit('update', { annotation, previous });
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  getById(id: string): Annotation | undefined {
    return this.map.get(id);
  }

  getByPage(pageIndex: number): ReadonlyArray<Annotation> {
    const order = this.pageOrder.get(pageIndex);
    if (!order) return [];
    return order
      .map(id => this.map.get(id))
      .filter((a): a is Annotation => a !== undefined);
  }

  getAll(): ReadonlyArray<Annotation> {
    return [...this.map.values()];
  }

  getPageIndices(): number[] {
    return [...this.pageOrder.keys()].sort((a, b) => a - b);
  }

  get size(): number { return this.map.size; }

  // ─── Events ─────────────────────────────────────────────────────────────

  on<K extends keyof AnnotationStoreEvents>(
    event: K,
    listener: (payload: AnnotationStoreEvents[K]) => void
  ): () => void {
    return this.emitter.on(event, listener);
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private ensurePage(pageIndex: number): string[] {
    let order = this.pageOrder.get(pageIndex);
    if (!order) {
      order = [];
      this.pageOrder.set(pageIndex, order);
    }
    return order;
  }
}
