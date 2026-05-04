/**
 * @file freehand-highlight.tool.ts
 * Highlighter pen tool – draws a freehand path rendered as a thick,
 * semi-transparent stroke (real highlighter effect via canvas `multiply`
 * composite operation in the painter).
 *
 * The highlight colour is read live from ctx.activeStyle.fillColor so that
 * colour-picker changes in the toolbar take effect immediately, even on the
 * very first stroke.
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
export declare class FreehandHighlightTool implements Tool {
    readonly id: "highlight";
    readonly name = "Highlight";
    readonly cursor: ToolCursor;
    private points;
    private drawing;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    /** Resolve the current highlight colour from activeStyle, falling back to yellow. */
    private resolveColor;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    /** Live preview while drawing – reads the selected colour immediately. */
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
}
//# sourceMappingURL=freehand-highlight.tool.d.ts.map