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
export interface AnnotationStoreEvents extends EventMap {
    /** Emitted after any annotation is added */
    add: {
        annotation: Annotation;
    };
    /** Emitted after an annotation is replaced (style/geometry update) */
    update: {
        annotation: Annotation;
        previous: Annotation;
    };
    /** Emitted after an annotation is removed */
    remove: {
        id: string;
        pageIndex: number;
    };
    /** Emitted when the entire store is replaced (import/clear) */
    reset: {
        docId: string;
    };
}
export declare class AnnotationStore {
    /** page index → ordered list of annotation ids (draw order) */
    private readonly pageOrder;
    /** id → annotation */
    private readonly map;
    private readonly emitter;
    private _docId;
    get docId(): string;
    /** Replace all store contents with a new document */
    loadDocument(docId: string, annotations: ReadonlyArray<Annotation>): void;
    clear(docId: string): void;
    add(annotation: Annotation): void;
    remove(id: string): void;
    /**
     * Update specific fields of an annotation.
     * Prefer replace() when you have the full new object.
     */
    update(id: string, patch: Partial<Annotation>): void;
    /** Replace an annotation entirely (used by undo/redo) */
    replace(annotation: Annotation): void;
    getById(id: string): Annotation | undefined;
    getByPage(pageIndex: number): ReadonlyArray<Annotation>;
    getAll(): ReadonlyArray<Annotation>;
    getPageIndices(): number[];
    get size(): number;
    on<K extends keyof AnnotationStoreEvents>(event: K, listener: (payload: AnnotationStoreEvents[K]) => void): () => void;
    private ensurePage;
}
//# sourceMappingURL=annotation-store.d.ts.map