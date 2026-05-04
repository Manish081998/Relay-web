/**
 * @file pointer-handler.ts
 * Translates DOM Pointer Events into tool-friendly ToolPointerEvents,
 * dispatching to the active tool's handlers.
 *
 * Touch support:
 * PointerEvents unify mouse, pen, and touch – no separate touch-event
 * handling is needed.  The browser synthesises pointer events from
 * touch events automatically.
 *
 * Multi-touch:
 * We only handle one active pointer at a time (the first one down).
 * Two-finger pinch/pan is left to the host app's viewport adapter.
 */
import type { Tool, ToolContext, ViewportAdapter, Command } from '@adticorp/annot-core';
export interface PointerHandlerOptions {
    target: HTMLElement;
    adapter: ViewportAdapter;
    getActiveTool: () => Tool | null;
    getContext: () => ToolContext;
    onCommand: (cmd: Command) => void;
    onCursorChange: (cursor: string) => void;
}
export declare class PointerHandler {
    private readonly target;
    private readonly adapter;
    private readonly getActiveTool;
    private readonly getContext;
    private readonly onCommand;
    private readonly onCursorChange;
    private activePointerId;
    private readonly cleanups;
    constructor(opts: PointerHandlerOptions);
    private attach;
    destroy(): void;
    private handlePointerDown;
    private handlePointerMove;
    private handlePointerUp;
    private handleDoubleClick;
    private buildEvent;
}
//# sourceMappingURL=pointer-handler.d.ts.map