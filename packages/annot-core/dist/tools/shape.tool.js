/**
 * @file shape.tool.ts
 * Rectangle, Ellipse, Arrow, Line, and Highlight drawing tools.
 * All share the same drag-to-draw pattern; they only differ in
 * annotation type and default styles.
 */
import { DEFAULT_HIGHLIGHT_STYLE } from '../model/annotation.model.js';
import { AddAnnotationCommand } from '../commands/annotation-commands.js';
import { rectFromPoints } from '../geometry/geometry.js';
import { buildAnnotation } from './tool-helpers.js';
export class ShapeTool {
    id;
    cursor = 'crosshair';
    startPoint = null;
    currentPoint = null;
    drawing = false;
    constructor(id) {
        this.id = id;
    }
    get name() {
        return this.id.charAt(0).toUpperCase() + this.id.slice(1);
    }
    activate(_ctx) { this.reset(); }
    deactivate(_ctx) { this.reset(); }
    reset() {
        this.startPoint = null;
        this.currentPoint = null;
        this.drawing = false;
    }
    onPointerDown(evt, ctx) {
        ctx.setSelectedIds(new Set());
        this.startPoint = evt.docPoint;
        this.currentPoint = evt.docPoint;
        this.drawing = true;
        evt.original.currentTarget?.setPointerCapture?.(evt.original.pointerId);
        return null;
    }
    onPointerMove(evt, ctx) {
        if (!this.drawing)
            return null;
        this.currentPoint = evt.docPoint;
        ctx.requestRedraw();
        return null;
    }
    onPointerUp(evt, ctx) {
        if (!this.drawing || !this.startPoint)
            return null;
        const end = evt.docPoint;
        this.drawing = false;
        const rect = rectFromPoints(this.startPoint, end);
        // Minimum size check
        if (rect.width < 4 && rect.height < 4 && this.id !== 'arrow' && this.id !== 'line') {
            this.reset();
            return null;
        }
        const geometry = this.buildGeometry(this.startPoint, end);
        const style = this.id === 'highlight'
            ? DEFAULT_HIGHLIGHT_STYLE
            : ctx.activeStyle;
        const annotation = buildAnnotation(ctx.docId, ctx.pageIndex, this.id, ctx.author, style, geometry);
        this.reset();
        const cmd = new AddAnnotationCommand(ctx.store, annotation);
        ctx.setSelectedIds(new Set([annotation.id]));
        return cmd;
    }
    drawOverlay(ctx2d, ctx) {
        if (!this.drawing || !this.startPoint || !this.currentPoint)
            return;
        const { zoom, panX, panY } = ctx.adapter.getViewportTransform();
        const toScreen = (p) => ({ x: p.x * zoom + panX, y: p.y * zoom + panY });
        const s = toScreen(this.startPoint);
        const e = toScreen(this.currentPoint);
        ctx2d.save();
        ctx2d.globalAlpha = ctx.activeStyle.opacity;
        ctx2d.strokeStyle = this.id === 'highlight' ? DEFAULT_HIGHLIGHT_STYLE.fillColor : ctx.activeStyle.strokeColor;
        ctx2d.fillStyle = this.id === 'highlight' ? DEFAULT_HIGHLIGHT_STYLE.fillColor : ctx.activeStyle.fillColor;
        ctx2d.lineWidth = ctx.activeStyle.strokeWidth;
        ctx2d.setLineDash(ctx.activeStyle.dashPattern ? [...ctx.activeStyle.dashPattern] : []);
        ctx2d.lineJoin = ctx.activeStyle.lineJoin ?? 'round';
        ctx2d.lineCap = ctx.activeStyle.lineCap ?? 'round';
        switch (this.id) {
            case 'rectangle':
            case 'highlight': {
                const rx = Math.min(s.x, e.x), ry = Math.min(s.y, e.y);
                const rw = Math.abs(e.x - s.x), rh = Math.abs(e.y - s.y);
                ctx2d.fillRect(rx, ry, rw, rh);
                if (this.id === 'rectangle')
                    ctx2d.strokeRect(rx, ry, rw, rh);
                break;
            }
            case 'ellipse': {
                const cx = (s.x + e.x) / 2, cy = (s.y + e.y) / 2;
                const rx = Math.abs(e.x - s.x) / 2, ry = Math.abs(e.y - s.y) / 2;
                ctx2d.beginPath();
                ctx2d.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
                ctx2d.fill();
                ctx2d.stroke();
                break;
            }
            case 'line':
            case 'arrow': {
                ctx2d.beginPath();
                ctx2d.moveTo(s.x, s.y);
                ctx2d.lineTo(e.x, e.y);
                ctx2d.stroke();
                if (this.id === 'arrow') {
                    this.drawArrowHead(ctx2d, s, e);
                }
                break;
            }
        }
        ctx2d.restore();
    }
    drawArrowHead(ctx2d, from, to) {
        const headLen = 14;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx2d.beginPath();
        ctx2d.moveTo(to.x, to.y);
        ctx2d.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx2d.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx2d.closePath();
        ctx2d.fillStyle = ctx2d.strokeStyle;
        ctx2d.fill();
    }
    buildGeometry(start, end) {
        switch (this.id) {
            case 'rectangle':
            case 'highlight':
            case 'ellipse':
                return { kind: 'rect', rect: rectFromPoints(start, end) };
            case 'line':
                return { kind: 'line', startPoint: start, endPoint: end, hasArrowHead: false, hasArrowTail: false };
            case 'arrow':
                return { kind: 'line', startPoint: start, endPoint: end, hasArrowHead: true, hasArrowTail: false };
        }
    }
}
//# sourceMappingURL=shape.tool.js.map