/**
 * @file annotator.component.ts
 * Root host component for the annotation overlay.
 *
 * Usage:
 *   <company-annotator
 *     [adapter]="myAdapter"
 *     [docId]="documentId"
 *     [author]="currentUser"
 *     (annotationsChange)="onAnnotationsChange($event)">
 *   </company-annotator>
 *
 * The component is position:relative and fills its parent.
 * The host app should give it a defined size (width/height or flex).
 */
import { EventEmitter, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ElementRef } from '@angular/core';
import type { ViewportAdapter, Annotation, AnnotationStyle, ToolId } from '@adticorp/annot-core';
import { AnnotationEngineService } from '../../services/annotation-engine.service';
import * as i0 from "@angular/core";
export declare class AnnotatorComponent implements AfterViewInit, OnDestroy, OnChanges {
    /** Adapter that provides coordinate conversion and viewport info */
    adapter: ViewportAdapter;
    /** Document identifier (used for storage keys and export filenames) */
    docId: string;
    /** Author name stamped on new annotations */
    author: string;
    /** Initial annotations to load (e.g. from server) */
    set initialAnnotations(value: ReadonlyArray<Annotation> | null);
    /** Whether the toolbar is visible */
    showToolbar: boolean;
    /** Whether the annotation panel sidebar is visible */
    showPanel: boolean;
    /** Whether to auto-save to localStorage */
    autoSave: boolean;
    /** Make the annotation host background transparent (for overlay-on-content use cases) */
    transparent: boolean;
    /** Emits whenever any annotation is added / updated / removed */
    annotationsChange: EventEmitter<readonly Annotation[]>;
    /** Emits the JSON string when user clicks Save */
    save: EventEmitter<string>;
    overlayContainerRef: ElementRef<HTMLDivElement>;
    readonly engine: AnnotationEngineService;
    private readonly keyboard;
    readonly TOOL_IDS: {
        readonly SELECT: "select";
        readonly HIGHLIGHT: "highlight";
        readonly FREEHAND: "freehand";
        readonly TEXT: "text";
        readonly COMMENT: "comment";
        readonly RECTANGLE: "rectangle";
        readonly ELLIPSE: "ellipse";
        readonly ARROW: "arrow";
        readonly LINE: "line";
        readonly ERASER: "eraser";
    };
    private engineReady;
    private _pendingAnnotations;
    readonly panelOpen: import("@angular/core").WritableSignal<boolean>;
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngOnDestroy(): void;
    onToolSelect(toolId: ToolId): void;
    onStyleChange(patch: Partial<AnnotationStyle>): void;
    onUndo(): void;
    onRedo(): void;
    onSave(): void;
    onDownload(): void;
    onImport(): Promise<void>;
    onDeleteSelected(): void;
    togglePanel(): void;
    onAnnotationClick(annotationId: string): void;
    private emitAnnotations;
    static ɵfac: i0.ɵɵFactoryDeclaration<AnnotatorComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<AnnotatorComponent, "company-annotator", never, { "adapter": { "alias": "adapter"; "required": true; }; "docId": { "alias": "docId"; "required": false; }; "author": { "alias": "author"; "required": false; }; "initialAnnotations": { "alias": "initialAnnotations"; "required": false; }; "showToolbar": { "alias": "showToolbar"; "required": false; }; "showPanel": { "alias": "showPanel"; "required": false; }; "autoSave": { "alias": "autoSave"; "required": false; }; "transparent": { "alias": "transparent"; "required": false; }; }, { "annotationsChange": "annotationsChange"; "save": "save"; }, never, never, false, never>;
}
