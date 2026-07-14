/**
 * @file text.tool.ts
 * Text annotation tool.
 *
 * Click anywhere → creates a text box at that position.
 * Double-click on existing text annotation → enters edit mode.
 *
 * Text editing is delegated to a positioned <textarea> element
 * (created by the renderer layer) because native browser text
 * editing handles IME, accessibility, and platform conventions
 * better than a Canvas-drawn text editor.
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
export declare class TextTool implements Tool {
    readonly id: "text";
    readonly name = "Text";
    readonly cursor: ToolCursor;
    private editingId;
    private editingStart;
    private drawing;
    private startPoint;
    private currentPoint;
    /** Emit this event so the renderer can position the textarea editor */
    onRequestTextEdit?: (annotationId: string, docRect: import('../model/annotation.model.js').Rect) => void;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onDoubleClick(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
    /** Called by renderer when user confirms/blurs the text editor */
    commitTextEdit(annotationId: string, text: string, ctx: ToolContext): Command | null;
}
//# sourceMappingURL=text.tool.d.ts.map