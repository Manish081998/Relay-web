/**
 * @file annotation-engine.service.ts
 * The central Angular service that wires together the core engine,
 * renderer, and all tool instances.
 *
 * It is provided at the component level (via `providers` on
 * AnnotatorComponent) so each annotator instance gets its own engine.
 *
 * RESPONSIBILITIES
 *  - Own the AnnotationStore and CommandStack
 *  - Create and hold all Tool instances
 *  - Bridge Angular (Signals / Observables) ↔ core engine events
 *  - Expose an imperative API for Angular components
 */
import { OnDestroy } from '@angular/core';
import { AnnotationStore, CommandStack } from '@adticorp/annot-core';
import type { Tool, ToolId, Annotation, AnnotationStyle, ViewportAdapter, Command } from '@adticorp/annot-core';
import { CanvasRenderer } from '@adticorp/annot-renderer';
import * as i0 from "@angular/core";
export declare class AnnotationEngineService implements OnDestroy {
    readonly store: AnnotationStore;
    readonly commandStack: CommandStack;
    readonly activeToolId: import("@angular/core").WritableSignal<ToolId>;
    readonly selectedIds: import("@angular/core").WritableSignal<ReadonlySet<string>>;
    readonly activeStyle: import("@angular/core").WritableSignal<AnnotationStyle>;
    readonly canUndo: import("@angular/core").WritableSignal<boolean>;
    readonly canRedo: import("@angular/core").WritableSignal<boolean>;
    readonly annotations: import("@angular/core").WritableSignal<readonly Annotation[]>;
    private readonly tools;
    renderer: CanvasRenderer | null;
    private _docId;
    private _author;
    private readonly unsubs;
    /**
     * Call this from AnnotatorComponent.ngAfterViewInit once the
     * host container element is available.
     */
    init(container: HTMLElement, adapter: ViewportAdapter, docId: string, author: string): void;
    selectTool(id: ToolId): void;
    getTool(id: ToolId): Tool | undefined;
    setStyle(patch: Partial<AnnotationStyle>): void;
    applyStyleToSelected(patch: Partial<AnnotationStyle>): void;
    selectAll(pageIndex: number): void;
    clearSelection(): void;
    deleteSelected(): void;
    undo(): void;
    redo(): void;
    executeCommand(cmd: Command): void;
    /** Load annotations from a JSON string (clears current state) */
    loadFromJson(json: string): void;
    /** Open a file picker and import JSON annotations */
    importAnnotations(): Promise<void>;
    /** Export all annotations to a JSON string */
    exportToJson(): string;
    /** Download annotations as a JSON file */
    downloadAnnotations(filename?: string): void;
    /** Save annotations to localStorage */
    saveToLocalStorage(key?: string): void;
    /** Load annotations from localStorage */
    loadFromLocalStorage(key?: string): boolean;
    setActivePage(pageIndex: number): void;
    /** Call after host zoom/pan changes so renderer redraws */
    notifyViewportChanged(): void;
    showTextEditor(annotationId: string): void;
    private syncAnnotations;
    ngOnDestroy(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<AnnotationEngineService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<AnnotationEngineService>;
}
