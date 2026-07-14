/**
 * @file tool.interface.ts
 * Abstract tool interface and tool-state-machine types.
 *
 * Each tool is a strategy object that receives pointer events
 * (already translated to document coordinates) and emits commands
 * to the command stack.
 *
 * The tool never directly modifies the store – it creates Command
 * objects and returns them to the engine which executes them via the
 * command stack (preserving undo/redo).
 */
import type { Point } from '../model/annotation.model.js';
import type { Command } from '../commands/command.interface.js';
import type { AnnotationStore } from '../store/annotation-store.js';
import type { ViewportAdapter } from '../adapter/viewport-adapter.interface.js';
export interface ToolPointerEvent {
    /** Point in document coordinates */
    readonly docPoint: Point;
    /** Point in screen coordinates */
    readonly screenPoint: Point;
    /** Which page the event is on */
    readonly pageIndex: number;
    /** Raw browser pointer event */
    readonly original: PointerEvent;
    /** Whether Shift is held (multi-select / constrain) */
    readonly shiftKey: boolean;
    /** Whether Ctrl/Cmd is held */
    readonly ctrlKey: boolean;
}
export interface ToolContext {
    readonly store: AnnotationStore;
    readonly adapter: ViewportAdapter;
    /** Author string to stamp on new annotations */
    readonly author: string;
    /** Currently active page */
    readonly pageIndex: number;
    /** docId of the open document */
    readonly docId: string;
    /** Currently selected annotation ids */
    readonly selectedIds: ReadonlySet<string>;
    /** Notify the selection state changed */
    setSelectedIds(ids: ReadonlySet<string>): void;
    /** Request the renderer to do a partial redraw */
    requestRedraw(): void;
    /** Push a command onto the undo stack */
    execute(cmd: Command): void;
    /** Current active style for the tool */
    activeStyle: Readonly<import('../model/annotation.model.js').AnnotationStyle>;
}
export type ToolCursor = 'default' | 'crosshair' | 'pointer' | 'text' | 'move' | 'grab' | 'grabbing' | 'ns-resize' | 'ew-resize' | 'nw-resize' | 'ne-resize' | 'nwse-resize' | 'nesw-resize' | 'cell' | 'none';
export interface Tool {
    /** Unique identifier for this tool */
    readonly id: string;
    /** Human-readable name */
    readonly name: string;
    /** Default cursor when this tool is active */
    readonly cursor: ToolCursor;
    /** Called when this tool becomes the active tool */
    activate(ctx: ToolContext): void;
    /** Called when another tool is selected; clean up in-progress state */
    deactivate(ctx: ToolContext): void;
    /** Pointer events – return a command if a mutation occurred, else null */
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    /** Double-click (e.g. finish freehand / enter text edit mode) */
    onDoubleClick?(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    /**
     * Keyboard events.  Return a command if a mutation occurred.
     * The engine filters for when this tool is active.
     */
    onKeyDown?(evt: KeyboardEvent, ctx: ToolContext): Command | null;
    /**
     * Called every animation frame while this tool is the active tool.
     * Use to draw in-progress (not-yet-committed) visuals on the overlay canvas.
     * @param ctx2d  Canvas 2D context of the overlay layer
     * @param ctx    Tool context
     */
    drawOverlay?(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
    /** Resolve the cursor at a given doc-space point (e.g. resize cursors over handles) */
    getCursorAt?(docPoint: Point, ctx: ToolContext): ToolCursor;
}
export declare const TOOL_IDS: {
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
export type ToolId = (typeof TOOL_IDS)[keyof typeof TOOL_IDS];
//# sourceMappingURL=tool.interface.d.ts.map