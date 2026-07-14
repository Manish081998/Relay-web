/**
 * @file comment.tool.ts
 * Comment / sticky-note tool.
 * Click anywhere to place a pin-icon annotation.
 * The comment text is entered in the sidebar panel.
 */
import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
export declare class CommentTool implements Tool {
    readonly id: "comment";
    readonly name = "Comment";
    readonly cursor: ToolCursor;
    /**
     * Called after a comment pin is placed so the host can open an input popup.
     * Fired via setTimeout so the AddAnnotationCommand has already been executed
     * and the annotation exists in the store when the callback runs.
     */
    onRequestCommentEdit?: (annotationId: string) => void;
    activate(_ctx: ToolContext): void;
    deactivate(_ctx: ToolContext): void;
    onPointerDown(_evt: ToolPointerEvent, _ctx: ToolContext): Command | null;
    onPointerMove(_evt: ToolPointerEvent, _ctx: ToolContext): Command | null;
    onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null;
}
//# sourceMappingURL=comment.tool.d.ts.map