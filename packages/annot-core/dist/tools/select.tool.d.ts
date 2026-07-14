/**
 * @file select.tool.ts
 * Select / Move / Resize tool.
 *
 * Behaviour:
 *  - Click on annotation → select it (Shift-click → multi-select)
 *  - Click on empty area → deselect all / start lasso
 *  - Drag selected annotation → move
 *  - Drag a resize handle → resize
 *  - Delete key → delete selected
 *  - Arrow keys → nudge selected (1 doc unit, Shift = 10)
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
import type { Point } from '../model/annotation.model.js';
export declare class SelectTool implements Tool {
    readonly id: "select";
    readonly name = "Select";
    readonly cursor: ToolCursor;
    private mode;
    private lassoStart;
    private lassoRect;
    private dragStart;
    private activeHandle;
    private resizeTarget;
    private resizeOriginal;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onKeyDown(evt: KeyboardEvent, ctx: ToolContext): Command | null;
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
    getCursorAt(docPoint: Point, ctx: ToolContext): ToolCursor;
    private doResize;
}
//# sourceMappingURL=select.tool.d.ts.map