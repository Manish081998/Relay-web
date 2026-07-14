/**
 * @file freehand.tool.ts
 * Pen / freehand drawing tool.
 *
 * Points are collected in document coordinates as the pointer moves,
 * then simplified (Douglas–Peucker) on pointer-up before committing
 * to the store to reduce point count.
 */
import { TOOL_IDS } from './tool.interface.js';
import { DEFAULT_FREEHAND_STYLE } from '../model/annotation.model.js';
import { AddAnnotationCommand } from '../commands/annotation-commands.js';
import { pointsBounds, simplifyPath } from '../geometry/geometry.js';
import { buildAnnotation } from './tool-helpers.js';
const SIMPLIFY_TOLERANCE = 1.5; // doc units
const MIN_POINTS = 2;
export class FreehandTool {
    id = TOOL_IDS.FREEHAND;
    name = 'Draw';
    cursor = 'crosshair';
    points = [];
    drawing = false;
    activate(_ctx) { this.reset(); }
    deactivate(_ctx) { this.reset(); }
    reset() {
        this.points = [];
        this.drawing = false;
    }
    onPointerDown(evt, ctx) {
        ctx.setSelectedIds(new Set());
        this.drawing = true;
        this.points = [evt.docPoint];
        evt.original.currentTarget?.setPointerCapture?.(evt.original.pointerId);
        return null;
    }
    onPointerMove(evt, ctx) {
        if (!this.drawing)
            return null;
        const last = this.points[this.points.length - 1];
        const dx = evt.docPoint.x - last.x;
        const dy = evt.docPoint.y - last.y;
        // Only append if moved more than 1 doc unit (debounce micro-jitter)
        if (dx * dx + dy * dy > 1) {
            this.points.push(evt.docPoint);
            ctx.requestRedraw();
        }
        return null;
    }
    onPointerUp(evt, ctx) {
        if (!this.drawing)
            return null;
        this.drawing = false;
        if (this.points.length < MIN_POINTS) {
            this.reset();
            return null;
        }
        // Simplify and create annotation
        const simplified = simplifyPath(this.points, SIMPLIFY_TOLERANCE);
        const bounds = pointsBounds(simplified);
        const style = { ...DEFAULT_FREEHAND_STYLE, ...ctx.activeStyle };
        const geometry = {
            kind: 'path',
            points: simplified,
            closed: false,
            bounds,
        };
        const annotation = buildAnnotation(ctx.docId, ctx.pageIndex, 'freehand', ctx.author, style, geometry);
        this.reset();
        const cmd = new AddAnnotationCommand(ctx.store, annotation);
        ctx.setSelectedIds(new Set([annotation.id]));
        return cmd;
    }
    drawOverlay(ctx2d, ctx) {
        if (!this.drawing || this.points.length < 2)
            return;
        const { zoom, panX, panY } = ctx.adapter.getViewportTransform();
        const toScreen = (p) => ({ x: p.x * zoom + panX, y: p.y * zoom + panY });
        ctx2d.save();
        ctx2d.strokeStyle = ctx.activeStyle.strokeColor;
        ctx2d.lineWidth = ctx.activeStyle.strokeWidth;
        ctx2d.lineCap = ctx.activeStyle.lineCap ?? 'round';
        ctx2d.lineJoin = ctx.activeStyle.lineJoin ?? 'round';
        ctx2d.globalAlpha = ctx.activeStyle.opacity;
        ctx2d.setLineDash([]);
        ctx2d.beginPath();
        const s0 = toScreen(this.points[0]);
        ctx2d.moveTo(s0.x, s0.y);
        for (let i = 1; i < this.points.length; i++) {
            const sp = toScreen(this.points[i]);
            ctx2d.lineTo(sp.x, sp.y);
        }
        ctx2d.stroke();
        ctx2d.restore();
    }
}
//# sourceMappingURL=freehand.tool.js.map