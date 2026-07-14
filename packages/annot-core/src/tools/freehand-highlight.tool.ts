/**
 * @file freehand-highlight.tool.ts
 * Highlighter pen tool – draws a freehand path rendered as a thick,
 * semi-transparent stroke (real highlighter effect via canvas `multiply`
 * composite operation in the painter).
 *
 * The highlight colour is read live from ctx.activeStyle.fillColor so that
 * colour-picker changes in the toolbar take effect immediately, even on the
 * very first stroke.
 */

import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import { TOOL_IDS } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
import type { Point, AnnotationStyle } from '../model/annotation.model.js';
import { DEFAULT_HIGHLIGHT_STYLE } from '../model/annotation.model.js';
import { AddAnnotationCommand } from '../commands/annotation-commands.js';
import { pointsBounds, simplifyPath } from '../geometry/geometry.js';
import { buildAnnotation } from './tool-helpers.js';

/** Thickness in document units (~1 line of text on an A4 page at 72 dpi) */
const HIGHLIGHT_STROKE_WIDTH = 16;
const SIMPLIFY_TOLERANCE     = 2.0; // slightly coarser than pen – precision matters less
const MIN_POINTS             = 2;

export class FreehandHighlightTool implements Tool {
  readonly id     = TOOL_IDS.HIGHLIGHT;
  readonly name   = 'Highlight';
  readonly cursor: ToolCursor = 'crosshair';

  private points: Point[] = [];
  private drawing = false;

  activate(_ctx: ToolContext): void  { this.reset(); }
  deactivate(_ctx: ToolContext): void { this.reset(); }

  private reset(): void {
    this.points = [];
    this.drawing = false;
  }

  /** Resolve the current highlight colour from activeStyle, falling back to yellow. */
  private resolveColor(ctx: ToolContext): string {
    const c = ctx.activeStyle.fillColor;
    return c && c !== 'transparent' && c !== '' ? c : DEFAULT_HIGHLIGHT_STYLE.fillColor;
  }

  onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    ctx.setSelectedIds(new Set());
    this.drawing = true;
    this.points  = [evt.docPoint];
    (evt.original.currentTarget as Element | null)?.setPointerCapture?.(evt.original.pointerId);
    return null;
  }

  onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    if (!this.drawing) return null;
    const last = this.points[this.points.length - 1];
    const dx = evt.docPoint.x - last.x;
    const dy = evt.docPoint.y - last.y;
    if (dx * dx + dy * dy > 1) {
      this.points.push(evt.docPoint);
      ctx.requestRedraw();
    }
    return null;
  }

  onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    if (!this.drawing) return null;
    this.drawing = false;

    if (this.points.length < MIN_POINTS) { this.reset(); return null; }

    const simplified = simplifyPath(this.points, SIMPLIFY_TOLERANCE);
    const bounds     = pointsBounds(simplified);

    // Reject near-zero selections caused by a plain click (no meaningful drag).
    if (bounds.width < 4 && bounds.height < 4) { this.reset(); return null; }

    const color      = this.resolveColor(ctx);

    // Store color as strokeColor so applyStyle() sets ctx.strokeStyle correctly
    // for the thick-stroke path painter.
    const style: AnnotationStyle = {
      strokeColor: color,
      fillColor:   color,
      opacity:     1,             // alpha is already baked into the rgba string
      strokeWidth: HIGHLIGHT_STROKE_WIDTH,
      lineCap:  'round',
      lineJoin: 'round',
    };

    const geometry = {
      kind: 'path' as const,
      points: simplified,
      closed: false,
      bounds,
    };

    const annotation = buildAnnotation(
      ctx.docId, ctx.pageIndex, 'highlight', ctx.author, style, geometry
    );

    this.reset();
    const cmd = new AddAnnotationCommand(ctx.store, annotation);
    ctx.setSelectedIds(new Set([annotation.id]));
    return cmd;
  }

  /** Live preview while drawing – reads the selected colour immediately. */
  drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.drawing || this.points.length < 2) return;
    const { zoom, panX, panY } = ctx.adapter.getViewportTransform();
    const toScreen = (p: Point): Point => ({ x: p.x * zoom + panX, y: p.y * zoom + panY });
    const color = this.resolveColor(ctx);

    ctx2d.save();
    ctx2d.globalCompositeOperation = 'multiply';
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth   = HIGHLIGHT_STROKE_WIDTH * zoom;
    ctx2d.lineCap     = 'round';
    ctx2d.lineJoin    = 'round';
    ctx2d.globalAlpha = 1; // alpha embedded in rgba
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
