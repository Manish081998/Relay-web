/**
 * @file shape.tool.ts
 * Rectangle, Ellipse, Arrow, Line, and Highlight drawing tools.
 * All share the same drag-to-draw pattern; they only differ in
 * annotation type and default styles.
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
type ShapeToolId = 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'highlight';
export declare class ShapeTool implements Tool {
    readonly id: ShapeToolId;
    readonly cursor: ToolCursor;
    private startPoint;
    private currentPoint;
    private drawing;
    constructor(id: ShapeToolId);
    get name(): string;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    private reset;
    onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
    drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void;
    private drawArrowHead;
    private buildGeometry;
}
export {};
//# sourceMappingURL=shape.tool.d.ts.map