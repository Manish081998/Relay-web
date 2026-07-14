/**
 * @file canvas-renderer.ts
 * Main renderer – coordinates layers, schedules RAF frames, and handles
 * incremental dirty-rect updates.
 *
 * RENDER STRATEGY
 * ┌────────────────────────────────────────────────────────────┐
 * │ Store event → mark base-layer dirty                         │
 * │ Selection change → mark selection-layer dirty              │
 * │ Pointer move (drawing) → mark overlay dirty                │
 * │                                                            │
 * │ requestAnimationFrame loop:                                │
 * │   if base dirty     → repaint base layer                   │
 * │   if selection dirty → repaint selection layer             │
 * │   always           → repaint overlay (active tool ink)     │
 * │                                                            │
 * │ Only layers that changed are repainted each frame.         │
 * └────────────────────────────────────────────────────────────┘
 *
 * PERFORMANCE FOR 500+ ANNOTATIONS
 * - Annotations are painted in draw-order from the store page list.
 * - Non-selected annotations go to the base layer (only redrawn
 *   when store data changes, not on every pointer move).
 * - Selected annotations + handles go to the selection layer.
 * - Active-tool overlay is cleared and redrawn every frame.
 * - Page-level AABB is used to skip off-screen pages.
 */
import type { AnnotationStore, ViewportAdapter, Tool, AnnotationStyle, Command } from '@adticorp/annot-core';
export interface RendererOptions {
    /** The host element; canvases will be appended as children */
    container: HTMLElement;
    store: AnnotationStore;
    adapter: ViewportAdapter;
    author?: string;
    docId: string;
}
export interface RendererState {
    activeToolId: string;
    selectedIds: ReadonlySet<string>;
    activeStyle: AnnotationStyle;
    activePage: number;
}
export declare class CanvasRenderer {
    private readonly layers;
    private readonly store;
    private readonly adapter;
    private readonly author;
    private readonly docId;
    private activeTool;
    private selectedIds;
    private activeStyle;
    private activePage;
    private baseDirty;
    private selectionDirty;
    private rafId;
    private destroyed;
    private pointerHandler;
    private readonly unsubs;
    private textEditorEl;
    private commentEditorEl;
    private commentOutsideHandler;
    onExecuteCommand?: (cmd: Command) => void;
    onSelectionChange?: (ids: ReadonlySet<string>) => void;
    constructor(opts: RendererOptions);
    setActiveTool(tool: Tool): void;
    setSelectedIds(ids: ReadonlySet<string>): void;
    setActiveStyle(style: AnnotationStyle): void;
    setActivePage(page: number): void;
    markBaseDirty(): void;
    markSelectionDirty(): void;
    markOverlayDirty(): void;
    requestRedraw(): void;
    /** Show a textarea editor over a text annotation */
    showTextEditor(annotationId: string): void;
    hideTextEditor(): void;
    /** Show a floating comment popup over a comment pin annotation */
    showCommentEditor(annotationId: string): void;
    hideCommentEditor(): void;
    destroy(): void;
    private startRafLoop;
    private render;
    private paintBase;
    private paintSelection;
    private paintOverlay;
    private buildContext;
    private attachPointerHandler;
    private subscribeToStore;
    private subscribeToAdapter;
    private observeContainerSize;
    private updateCursor;
    private commitTextEdit;
    private commitCommentEdit;
}
//# sourceMappingURL=canvas-renderer.d.ts.map