/**
 * @file eraser.tool.ts
 * Eraser tool.
 *
 * DESIGN CHOICE: "whole-annotation eraser"
 * When the user strokes over an annotation, the entire annotation is
 * deleted (not individual stroke segments).  This is simpler,
 * deterministic, and works for all annotation types.
 *
 * JUSTIFICATION: Segment-level erasing of freehand strokes requires
 * splitting Path geometry, which massively complicates hit-testing,
 * undo/redo, and serialisation.  A whole-annotation approach is what
 * Acrobat and most annotation tools default to.  If per-segment
 * erasing is required in future, it can be added as a separate
 * "Trim" tool operating only on freehand paths.
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
export declare class EraserTool implements Tool {
    readonly id: "eraser";
    readonly name = "Eraser";
    readonly cursor: ToolCursor;
    private erasing;
    private erasedIds;
    private currentPoint;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(_evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
    private eraseAt;
}
/**
 * Complete EraserTool with undo support (captures annotation snapshots before removal).
 * This is the production-ready version.
 */
export declare class EraserToolWithUndo implements Tool {
    readonly id: "eraser";
    readonly name = "Eraser";
    readonly cursor: ToolCursor;
    private erasing;
    private captured;
    private currentPoint;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(_evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
    private eraseAt;
}
//# sourceMappingURL=eraser.tool.d.ts.map