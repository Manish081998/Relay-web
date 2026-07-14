/**
 * @file freehand.tool.ts
 * Pen / freehand drawing tool.
 *
 * Points are collected in document coordinates as the pointer moves,
 * then simplified (Douglas–Peucker) on pointer-up before committing
 * to the store to reduce point count.
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
export declare class FreehandTool implements Tool {
    readonly id: "freehand";
    readonly name = "Draw";
    readonly cursor: ToolCursor;
    private points;
    private drawing;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
}
//# sourceMappingURL=freehand.tool.d.ts.map