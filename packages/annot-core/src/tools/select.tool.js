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
import { TOOL_IDS } from './tool.interface.js';
import { MoveAnnotationsCommand, RemoveAnnotationsCommand, } from '../commands/annotation-commands.js';
import { hitTestAll, hitTestHandle, hitTestLasso, selectionBounds, DEFAULT_HIT_TOLERANCE, HANDLE_HIT_RADIUS, } from '../geometry/hit-test.js';
import { rectFromPoints, rectResizeByHandle } from '../geometry/geometry.js';
export class SelectTool {
    id = TOOL_IDS.SELECT;
    name = 'Select';
    cursor = 'default';
    mode = 'idle';
    lassoStart = null;
    lassoRect = null;
    dragStart = null;
    activeHandle = null;
    resizeTarget = null;
    resizeOriginal = null;
    activate(_ctx) { this.reset(); }
    deactivate(_ctx) { this.reset(); }
    reset() {
        this.mode = 'idle';
        this.lassoStart = null;
        this.lassoRect = null;
        this.dragStart = null;
        this.activeHandle = null;
        this.resizeTarget = null;
        this.resizeOriginal = null;
    }
    onPointerDown(evt, ctx) {
        const { docPoint, pageIndex, shiftKey } = evt;
        const annotations = ctx.store.getByPage(pageIndex);
        const tol = DEFAULT_HIT_TOLERANCE / ctx.adapter.getViewportTransform().zoom;
        // 1. Try handle hit if something is selected
        if (ctx.selectedIds.size === 1) {
            const id = [...ctx.selectedIds][0];
            const bounds = selectionBounds([...ctx.selectedIds].map(i => ctx.store.getById(i)).filter(Boolean));
            if (bounds) {
                const handleIdx = hitTestHandle(docPoint, bounds, HANDLE_HIT_RADIUS / ctx.adapter.getViewportTransform().zoom);
                if (handleIdx !== null) {
                    this.mode = 'resizing';
                    this.activeHandle = handleIdx;
                    this.resizeTarget = id;
                    this.resizeOriginal = bounds;
                    this.dragStart = docPoint;
                    evt.original.currentTarget && evt.original.currentTarget.setPointerCapture?.(evt.original.pointerId);
                    return null;
                }
            }
        }
        // 2. Hit-test annotations
        const hits = hitTestAll(docPoint, annotations, tol);
        if (hits.length > 0) {
            const top = hits[0];
            if (!ctx.selectedIds.has(top.id) && !shiftKey) {
                ctx.setSelectedIds(new Set([top.id]));
            }
            else if (shiftKey) {
                const next = new Set(ctx.selectedIds);
                if (next.has(top.id))
                    next.delete(top.id);
                else
                    next.add(top.id);
                ctx.setSelectedIds(next);
            }
            this.mode = 'moving';
            this.dragStart = docPoint;
            evt.original.currentTarget && evt.original.currentTarget.setPointerCapture?.(evt.original.pointerId);
        }
        else {
            // 3. Start lasso
            if (!shiftKey)
                ctx.setSelectedIds(new Set());
            this.mode = 'lasso';
            this.lassoStart = docPoint;
            this.lassoRect = { x: docPoint.x, y: docPoint.y, width: 0, height: 0 };
        }
        return null;
    }
    onPointerMove(evt, ctx) {
        if (this.mode === 'moving' && this.dragStart && ctx.selectedIds.size > 0) {
            const dx = evt.docPoint.x - this.dragStart.x;
            const dy = evt.docPoint.y - this.dragStart.y;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)
                return null;
            const cmd = new MoveAnnotationsCommand(ctx.store, [...ctx.selectedIds], dx, dy);
            cmd.execute();
            this.dragStart = evt.docPoint;
            ctx.requestRedraw();
            return null; // Live preview – push final on pointer-up
        }
        if (this.mode === 'resizing' && this.resizeTarget && this.activeHandle !== null && this.dragStart) {
            this.doResize(evt.docPoint, ctx);
            return null;
        }
        if (this.mode === 'lasso' && this.lassoStart) {
            this.lassoRect = rectFromPoints(this.lassoStart, evt.docPoint);
            ctx.requestRedraw();
        }
        return null;
    }
    onPointerUp(evt, ctx) {
        if (this.mode === 'moving') {
            // The live-preview moves are already applied; wrap in a single command for undo
            // (We rely on MoveAnnotationsCommand.mergeWith to collapse intermediate moves)
            this.mode = 'idle';
            this.dragStart = null;
            return null;
        }
        if (this.mode === 'resizing' && this.resizeTarget) {
            const a = ctx.store.getById(this.resizeTarget);
            if (a) {
                this.mode = 'idle';
                this.reset();
                return null; // Already mutated live; resize was applied directly via store.replace
            }
        }
        if (this.mode === 'lasso' && this.lassoRect) {
            const annotations = ctx.store.getByPage(evt.pageIndex);
            const selected = annotations.filter(a => hitTestLasso(this.lassoRect, a)).map(a => a.id);
            const prev = new Set(ctx.selectedIds);
            const next = new Set([...prev, ...selected]);
            ctx.setSelectedIds(next);
            this.lassoRect = null;
        }
        this.mode = 'idle';
        this.dragStart = null;
        ctx.requestRedraw();
        return null;
    }
    onKeyDown(evt, ctx) {
        if (ctx.selectedIds.size === 0)
            return null;
        if (evt.key === 'Delete' || evt.key === 'Backspace') {
            evt.preventDefault();
            const cmd = new RemoveAnnotationsCommand(ctx.store, [...ctx.selectedIds]);
            ctx.setSelectedIds(new Set());
            return cmd;
        }
        const NUDGE = evt.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (evt.key === 'ArrowLeft') {
            dx = -NUDGE;
            evt.preventDefault();
        }
        if (evt.key === 'ArrowRight') {
            dx = NUDGE;
            evt.preventDefault();
        }
        if (evt.key === 'ArrowUp') {
            dy = -NUDGE;
            evt.preventDefault();
        }
        if (evt.key === 'ArrowDown') {
            dy = NUDGE;
            evt.preventDefault();
        }
        if (dx !== 0 || dy !== 0) {
            return new MoveAnnotationsCommand(ctx.store, [...ctx.selectedIds], dx, dy);
        }
        return null;
    }
    drawOverlay(ctx2d, ctx) {
        // Draw lasso
        if (this.mode === 'lasso' && this.lassoRect) {
            const { zoom, panX, panY } = ctx.adapter.getViewportTransform();
            const r = this.lassoRect;
            ctx2d.save();
            ctx2d.strokeStyle = '#0066FF';
            ctx2d.lineWidth = 1;
            ctx2d.setLineDash([5, 3]);
            ctx2d.fillStyle = 'rgba(0,102,255,0.05)';
            const sx = r.x * zoom + panX;
            const sy = r.y * zoom + panY;
            ctx2d.strokeRect(sx, sy, r.width * zoom, r.height * zoom);
            ctx2d.fillRect(sx, sy, r.width * zoom, r.height * zoom);
            ctx2d.restore();
        }
    }
    getCursorAt(docPoint, ctx) {
        // Show 'grabbing' while actively dragging
        if (this.mode === 'moving')
            return 'grabbing';
        // Show resize cursors over handles of the selected annotation
        if (ctx.selectedIds.size > 0) {
            const bounds = selectionBounds([...ctx.selectedIds].map(i => ctx.store.getById(i)).filter(Boolean));
            if (bounds) {
                const tol = HANDLE_HIT_RADIUS / ctx.adapter.getViewportTransform().zoom;
                const handle = hitTestHandle(docPoint, bounds, tol);
                if (handle !== null)
                    return handleCursors[handle];
            }
        }
        // Show 'grab' when hovering over any annotation (selected or not)
        const tol = DEFAULT_HIT_TOLERANCE / ctx.adapter.getViewportTransform().zoom;
        const hits = hitTestAll(docPoint, ctx.store.getByPage(ctx.pageIndex), tol);
        if (hits.length > 0)
            return 'grab';
        return 'default';
    }
    doResize(docPoint, ctx) {
        if (!this.resizeTarget || this.activeHandle === null || !this.resizeOriginal)
            return;
        const a = ctx.store.getById(this.resizeTarget);
        if (!a || a.geometry.kind !== 'rect')
            return;
        const dx = docPoint.x - (this.dragStart?.x ?? docPoint.x);
        const dy = docPoint.y - (this.dragStart?.y ?? docPoint.y);
        this.dragStart = docPoint;
        const newRect = rectResizeByHandle(a.geometry.rect, this.activeHandle, { x: dx, y: dy });
        const updated = { ...a, geometry: { kind: 'rect', rect: newRect }, updatedAt: new Date().toISOString() };
        ctx.store.replace(updated);
        ctx.requestRedraw();
    }
}
const handleCursors = [
    'nw-resize', 'ns-resize', 'ne-resize',
    'ew-resize',
    'nwse-resize', 'ns-resize', 'nesw-resize',
    'ew-resize',
];
//# sourceMappingURL=select.tool.js.map