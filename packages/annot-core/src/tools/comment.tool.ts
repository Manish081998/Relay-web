/**
 * @file comment.tool.ts
 * Comment / sticky-note tool.
 * Click anywhere to place a pin-icon annotation.
 * The comment text is entered in the sidebar panel.
 */

import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import { TOOL_IDS } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
import { DEFAULT_COMMENT_STYLE } from '../model/annotation.model.js';
import { AddAnnotationCommand } from '../commands/annotation-commands.js';
import { buildAnnotation } from './tool-helpers.js';

export class CommentTool implements Tool {
  readonly id = TOOL_IDS.COMMENT;
  readonly name = 'Comment';
  readonly cursor: ToolCursor = 'cell';

  /**
   * Called after a comment pin is placed so the host can open an input popup.
   * Fired via setTimeout so the AddAnnotationCommand has already been executed
   * and the annotation exists in the store when the callback runs.
   */
  onRequestCommentEdit?: (annotationId: string) => void;

  activate(_ctx: ToolContext): void { /* nothing */ }
  deactivate(_ctx: ToolContext): void { /* nothing */ }

  onPointerDown(_evt: ToolPointerEvent, _ctx: ToolContext): Command | null { return null; }
  onPointerMove(_evt: ToolPointerEvent, _ctx: ToolContext): Command | null { return null; }

  onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    const style = { ...DEFAULT_COMMENT_STYLE, ...ctx.activeStyle };
    const geometry = { kind: 'point' as const, point: evt.docPoint };
    const annotation = buildAnnotation(
      ctx.docId, ctx.pageIndex, 'comment', ctx.author, style, geometry, ''
    );
    const cmd = new AddAnnotationCommand(ctx.store, annotation);
    ctx.setSelectedIds(new Set([annotation.id]));
    // Defer so the command is committed to the store before the editor opens
    const id = annotation.id;
    setTimeout(() => this.onRequestCommentEdit?.(id), 0);
    return cmd;
  }
}
