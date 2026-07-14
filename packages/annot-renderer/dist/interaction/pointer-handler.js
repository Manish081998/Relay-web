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
export class PointerHandler {
    target;
    adapter;
    getActiveTool;
    getContext;
    onCommand;
    onCursorChange;
    activePointerId = null;
    cleanups = [];
    constructor(opts) {
        this.target = opts.target;
        this.adapter = opts.adapter;
        this.getActiveTool = opts.getActiveTool;
        this.getContext = opts.getContext;
        this.onCommand = opts.onCommand;
        this.onCursorChange = opts.onCursorChange;
        this.attach();
    }
    attach() {
        const el = this.target;
        const onPointerDown = (e) => this.handlePointerDown(e);
        const onPointerMove = (e) => this.handlePointerMove(e);
        const onPointerUp = (e) => this.handlePointerUp(e);
        const onPointerCancel = (e) => this.handlePointerUp(e);
        const onDoubleClick = (e) => this.handleDoubleClick(e);
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerCancel);
        el.addEventListener('dblclick', onDoubleClick);
        this.cleanups.push(() => el.removeEventListener('pointerdown', onPointerDown), () => el.removeEventListener('pointermove', onPointerMove), () => el.removeEventListener('pointerup', onPointerUp), () => el.removeEventListener('pointercancel', onPointerCancel), () => el.removeEventListener('dblclick', onDoubleClick));
    }
    destroy() {
        for (const fn of this.cleanups)
            fn();
        this.cleanups.length = 0;
    }
    // ─── Event handlers ───────────────────────────────────────────────────────
    handlePointerDown(e) {
        if (e.button !== 0 && e.pointerType === 'mouse')
            return; // ignore right-click
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId)
            return; // ignore secondary
        this.activePointerId = e.pointerId;
        const tool = this.getActiveTool();
        if (!tool)
            return;
        const ctx = this.getContext();
        const evt = this.buildEvent(e, ctx);
        const cmd = tool.onPointerDown(evt, ctx);
        if (cmd)
            this.onCommand(cmd);
    }
    handlePointerMove(e) {
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId)
            return;
        const tool = this.getActiveTool();
        if (!tool)
            return;
        const ctx = this.getContext();
        const evt = this.buildEvent(e, ctx);
        const cmd = tool.onPointerMove(evt, ctx);
        if (cmd)
            this.onCommand(cmd);
        // Update cursor from tool
        if (tool.getCursorAt) {
            const cursor = tool.getCursorAt(evt.docPoint, ctx);
            this.onCursorChange(cursor);
        }
        else {
            this.onCursorChange(tool.cursor);
        }
    }
    handlePointerUp(e) {
        if (e.pointerId !== this.activePointerId)
            return;
        this.activePointerId = null;
        const tool = this.getActiveTool();
        if (!tool)
            return;
        const ctx = this.getContext();
        const evt = this.buildEvent(e, ctx);
        const cmd = tool.onPointerUp(evt, ctx);
        if (cmd)
            this.onCommand(cmd);
    }
    handleDoubleClick(e) {
        const tool = this.getActiveTool();
        if (!tool?.onDoubleClick)
            return;
        const ctx = this.getContext();
        const fakePointer = e;
        const evt = this.buildEvent(fakePointer, ctx);
        const cmd = tool.onDoubleClick(evt, ctx);
        if (cmd)
            this.onCommand(cmd);
    }
    // ─── Event builder ────────────────────────────────────────────────────────
    buildEvent(e, ctx) {
        const bounds = this.target.getBoundingClientRect();
        const screenPoint = {
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top,
        };
        const pageIndex = this.adapter.getActivePageIndex();
        const docPoint = this.adapter.screenToDoc(screenPoint, pageIndex);
        return {
            docPoint,
            screenPoint,
            pageIndex,
            original: e,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey || e.metaKey,
        };
    }
}
//# sourceMappingURL=pointer-handler.js.map