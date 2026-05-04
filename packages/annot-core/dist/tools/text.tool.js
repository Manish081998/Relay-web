/**
 * @file text.tool.ts
 * Text annotation tool.
 *
 * Click anywhere → creates a text box at that position.
 * Double-click on existing text annotation → enters edit mode.
 *
 * Text editing is delegated to a positioned <textarea> element
 * (created by the renderer layer) because native browser text
 * editing handles IME, accessibility, and platform conventions
 * better than a Canvas-drawn text editor.
 */
import { TOOL_IDS } from './tool.interface.js';
import { DEFAULT_TEXT_STYLE } from '../model/annotation.model.js';
import { AddAnnotationCommand, UpdateAnnotationCommand } from '../commands/annotation-commands.js';
import { hitTestAll } from '../geometry/hit-test.js';
import { buildAnnotation, sanitiseText } from './tool-helpers.js';
const DEFAULT_TEXT_WIDTH = 160;
const DEFAULT_TEXT_HEIGHT = 40;
const DEFAULT_FONT_SIZE = 14;
export class TextTool {
    id = TOOL_IDS.TEXT;
    name = 'Text';
    cursor = 'text';
    editingId = null;
    editingStart = null;
    drawing = false;
    startPoint = null;
    currentPoint = null;
    /** Emit this event so the renderer can position the textarea editor */
    onRequestTextEdit;
    activate(_ctx) { this.reset(); }
    deactivate(_ctx) { this.reset(); }
    reset() {
        this.editingId = null;
        this.editingStart = null;
        this.drawing = false;
        this.startPoint = null;
        this.currentPoint = null;
    }
    onPointerDown(evt, ctx) {
        ctx.setSelectedIds(new Set());
        this.startPoint = evt.docPoint;
        this.currentPoint = evt.docPoint;
        this.drawing = true;
        return null;
    }
    onPointerMove(evt, ctx) {
        if (this.drawing) {
            this.currentPoint = evt.docPoint;
            ctx.requestRedraw();
        }
        return null;
    }
    onPointerUp(evt, ctx) {
        if (!this.drawing || !this.startPoint)
            return null;
        this.drawing = false;
        const dx = Math.abs(evt.docPoint.x - this.startPoint.x);
        const dy = Math.abs(evt.docPoint.y - this.startPoint.y);
        const wasDrag = dx > 8 || dy > 8;
        const rect = wasDrag
            ? {
                x: Math.min(this.startPoint.x, evt.docPoint.x),
                y: Math.min(this.startPoint.y, evt.docPoint.y),
                width: Math.max(dx, 40),
                height: Math.max(dy, 20),
            }
            : {
                x: this.startPoint.x,
                y: this.startPoint.y,
                width: DEFAULT_TEXT_WIDTH,
                height: DEFAULT_TEXT_HEIGHT,
            };
        const style = { ...DEFAULT_TEXT_STYLE, ...ctx.activeStyle };
        const geometry = { kind: 'rect', rect };
        const annotation = buildAnnotation(ctx.docId, ctx.pageIndex, 'text', ctx.author, style, geometry, '');
        const cmd = new AddAnnotationCommand(ctx.store, annotation);
        this.reset();
        ctx.setSelectedIds(new Set([annotation.id]));
        // Defer so the command is committed to the store before the editor opens
        const id = annotation.id;
        setTimeout(() => this.onRequestTextEdit?.(id, rect), 0);
        return cmd;
    }
    onDoubleClick(evt, ctx) {
        const annotations = ctx.store.getByPage(evt.pageIndex);
        const tol = 8 / ctx.adapter.getViewportTransform().zoom;
        const hits = hitTestAll(evt.docPoint, annotations, tol);
        const textAnnotation = hits.find(h => h.type === 'text');
        if (textAnnotation && textAnnotation.geometry.kind === 'rect') {
            this.editingId = textAnnotation.id;
            this.onRequestTextEdit?.(textAnnotation.id, textAnnotation.geometry.rect);
        }
        return null;
    }
    drawOverlay(ctx2d, ctx) {
        if (!this.drawing || !this.startPoint || !this.currentPoint)
            return;
        const { zoom, panX, panY } = ctx.adapter.getViewportTransform();
        const toS = (p) => ({ x: p.x * zoom + panX, y: p.y * zoom + panY });
        const s = toS(this.startPoint), e = toS(this.currentPoint);
        ctx2d.save();
        ctx2d.strokeStyle = '#007AFF';
        ctx2d.lineWidth = 1;
        ctx2d.setLineDash([4, 3]);
        ctx2d.strokeRect(Math.min(s.x, e.x), Math.min(s.y, e.y), Math.abs(e.x - s.x) || DEFAULT_TEXT_WIDTH * zoom, Math.abs(e.y - s.y) || DEFAULT_TEXT_HEIGHT * zoom);
        ctx2d.restore();
    }
    /** Called by renderer when user confirms/blurs the text editor */
    commitTextEdit(annotationId, text, ctx) {
        this.editingId = null;
        const safe = sanitiseText(text);
        return new UpdateAnnotationCommand(ctx.store, annotationId, {
            meta: { text: safe },
        });
    }
}
//# sourceMappingURL=text.tool.js.map