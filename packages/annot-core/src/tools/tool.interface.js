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
// ─── Tool ID constants ────────────────────────────────────────────────────────
export const TOOL_IDS = {
    SELECT: 'select',
    HIGHLIGHT: 'highlight',
    FREEHAND: 'freehand',
    TEXT: 'text',
    COMMENT: 'comment',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    ARROW: 'arrow',
    LINE: 'line',
    ERASER: 'eraser',
};
//# sourceMappingURL=tool.interface.js.map