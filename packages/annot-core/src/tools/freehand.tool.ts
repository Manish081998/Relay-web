/**
 * @file freehand.tool.ts
 * Pen / freehand drawing tool.
 *
 * Points are collected in document coordinates as the pointer moves,
 * then simplified (Douglas–Peucker) on pointer-up before committing
 * to the store to reduce point count.
 */

import type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tool.interface.js';
import { TOOL_IDS } from './tool.interface.js';
import type { Command } from '../commands/command.interface.js';
import type { Point } from '../model/annotation.model.js';
import { DEFAULT_FREEHAND_STYLE } from '../model/annotation.model.js';
import { AddAnnotationCommand } from '../commands/annotation-commands.js';
import { pointsBounds, simplifyPath } from '../geometry/geometry.js';
import { buildAnnotation } from './tool-helpers.js';

const SIMPLIFY_TOLERANCE = 1.5; // doc units
const MIN_POINTS = 2;

export class FreehandTool implements Tool {
  readonly id = TOOL_IDS.FREEHAND;
  readonly name = 'Draw';
  readonly cursor: ToolCursor = 'crosshair';

  private points: Point[] = [];
  private drawing = false;

  activate(_ctx: ToolContext): void { this.reset(); }
  deactivate(_ctx: ToolContext): void { this.reset(); }

  private reset(): void {
    this.points = [];
    this.drawing = false;
  }

  onPointerDown(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    ctx.setSelectedIds(new Set());
    this.drawing = true;
    this.points = [evt.docPoint];
    (evt.original.currentTarget as Element | null)?.setPointerCapture?.(evt.original.pointerId);
    return null;
  }

  onPointerMove(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    if (!this.drawing) return null;
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

  onPointerUp(evt: ToolPointerEvent, ctx: ToolContext): Command | null {
    if (!this.drawing) return null;
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
      kind: 'path' as const,
      points: simplified,
      closed: false,
      bounds,
    };

    const annotation = buildAnnotation(
      ctx.docId, ctx.pageIndex, 'freehand', ctx.author, style, geometry
    );

    this.reset();
    const cmd = new AddAnnotationCommand(ctx.store, annotation);
    ctx.setSelectedIds(new Set([annotation.id]));
    return cmd;
  }

  drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.drawing || this.points.length < 2) return;
    const { zoom, panX, panY } = ctx.adapter.getViewportTransform();
    const toScreen = (p: Point): Point => ({ x: p.x * zoom + panX, y: p.y * zoom + panY });

    ctx2d.save();
    ctx2d.strokeStyle = ctx.activeStyle.strokeColor;
    ctx2d.lineWidth = ctx.activeStyle.strokeWidth * zoom;
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
