/**
 * @file annotation-painters.ts
 * Stateless painter functions – each takes a CanvasRenderingContext2D and
 * an Annotation (in screen coordinates after transform) and paints it.
 *
 * Painters operate in screen-space: callers are expected to pre-multiply
 * the document-to-screen transform.  Each function saves/restores the
 * canvas state so they can be called in any order.
 */

import type { Annotation, Point } from '@adticorp/annot-core';
import { arrowHead, desanitiseText } from '@adticorp/annot-core';

// ─── Screen geometry helpers ──────────────────────────────────────────────────

/** A screen-space rect (already converted from doc coords) */
interface ScreenRect {
  x: number; y: number; width: number; height: number;
}

function toScreenRect(
  docRect: { x: number; y: number; width: number; height: number },
  zoom: number, panX: number, panY: number
): ScreenRect {
  return {
    x: docRect.x * zoom + panX,
    y: docRect.y * zoom + panY,
    width: docRect.width * zoom,
    height: docRect.height * zoom,
  };
}

function toScreenPt(p: Point, zoom: number, panX: number, panY: number): Point {
  return { x: p.x * zoom + panX, y: p.y * zoom + panY };
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function applyStyle(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  zoom: number
): void {
  const { style } = a;
  ctx.globalAlpha = style.opacity;
  ctx.strokeStyle = style.strokeColor;
  ctx.fillStyle = style.fillColor;
  ctx.lineWidth = style.strokeWidth * zoom;
  ctx.setLineDash(style.dashPattern ? [...style.dashPattern].map(v => v * zoom) : []);
  ctx.lineJoin = style.lineJoin ?? 'round';
  ctx.lineCap = style.lineCap ?? 'round';
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export interface PaintOptions {
  zoom: number;
  panX: number;
  panY: number;
  isSelected?: boolean;
}

/** Paint a single annotation onto the given canvas context */
export function paintAnnotation(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  opts: PaintOptions
): void {
  ctx.save();
  applyStyle(ctx, a, opts.zoom);

  switch (a.type) {
    case 'highlight':   paintHighlight(ctx, a, opts);   break;
    case 'rectangle':   paintRectangle(ctx, a, opts);   break;
    case 'ellipse':     paintEllipse(ctx, a, opts);     break;
    case 'freehand':    paintFreehand(ctx, a, opts);    break;
    case 'text':        paintText(ctx, a, opts);        break;
    case 'comment':     paintComment(ctx, a, opts);     break;
    case 'line':        paintLine(ctx, a, opts, false); break;
    case 'arrow':       paintLine(ctx, a, opts, true);  break;
  }

  ctx.restore();
}

// ─── Individual painters ──────────────────────────────────────────────────────

function paintHighlight(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void {
  const { zoom, panX, panY } = opts;
  ctx.globalCompositeOperation = 'multiply';

  if (a.geometry.kind === 'rect') {
    // Legacy rectangular highlight
    const r = toScreenRect(a.geometry.rect, zoom, panX, panY);
    ctx.fillRect(r.x, r.y, r.width, r.height);
  } else if (a.geometry.kind === 'path') {
    // Freehand highlight: thick stroke along the drawn path.
    // strokeColor and lineWidth are already set by applyStyle() above.
    const pts = a.geometry.points;
    if (pts.length < 2) return;
    ctx.beginPath();
    const p0 = toScreenPt(pts[0], zoom, panX, panY);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
      const p = toScreenPt(pts[i], zoom, panX, panY);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
}

function paintRectangle(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void {
  if (a.geometry.kind !== 'rect') return;
  const { zoom, panX, panY } = opts;
  const r = toScreenRect(a.geometry.rect, zoom, panX, panY);
  ctx.fillRect(r.x, r.y, r.width, r.height);
  if (a.style.strokeWidth > 0) ctx.strokeRect(r.x, r.y, r.width, r.height);
}

function paintEllipse(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void {
  if (a.geometry.kind !== 'rect') return;
  const { zoom, panX, panY } = opts;
  const r = toScreenRect(a.geometry.rect, zoom, panX, panY);
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const rx = r.width / 2, ry = r.height / 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
  ctx.fill();
  if (a.style.strokeWidth > 0) ctx.stroke();
}

function paintFreehand(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void {
  if (a.geometry.kind !== 'path') return;
  const { zoom, panX, panY } = opts;
  const pts = a.geometry.points;
  if (pts.length < 2) return;

  ctx.beginPath();
  const p0 = toScreenPt(pts[0], zoom, panX, panY);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const p = toScreenPt(pts[i], zoom, panX, panY);
    ctx.lineTo(p.x, p.y);
  }
  if (a.geometry.closed) ctx.closePath();
  ctx.stroke();
}

function paintText(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void {
  if (a.geometry.kind !== 'rect') return;
  const { zoom, panX, panY } = opts;
  const r = toScreenRect(a.geometry.rect, zoom, panX, panY);

  // Background
  ctx.fillRect(r.x, r.y, r.width, r.height);
  if (a.style.strokeWidth > 0) ctx.strokeRect(r.x, r.y, r.width, r.height);

  // Text
  const raw = a.meta.text ?? '';
  const text = desanitiseText(raw);
  const fontSize = (a.style.fontSize ?? 14) * zoom;
  const fontFamily = a.style.fontFamily ?? 'Arial, sans-serif';
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = a.style.fontColor ?? '#000';
  ctx.globalAlpha = a.style.opacity;

  const padding = 4 * zoom;
  const lineHeight = fontSize * 1.3;
  const maxWidth = r.width - padding * 2;

  // Word-wrap
  const lines = wrapText(ctx, text, maxWidth);
  for (let i = 0; i < lines.length; i++) {
    const ly = r.y + padding + (i + 1) * lineHeight;
    if (ly > r.y + r.height) break;
    ctx.fillText(lines[i], r.x + padding, ly, maxWidth);
  }
}

function paintComment(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void {
  if (a.geometry.kind !== 'point') return;
  const { zoom, panX, panY } = opts;
  const sp = toScreenPt(a.geometry.point, zoom, panX, panY);
  const size = 24;
  const pinColor = a.style.fillColor ?? '#007AFF';

  // Draw a pin-style icon
  ctx.fillStyle = pinColor;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y - size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Pin bottom
  ctx.fillStyle = pinColor;
  ctx.beginPath();
  ctx.moveTo(sp.x - 4, sp.y - 6);
  ctx.lineTo(sp.x, sp.y + 2);
  ctx.lineTo(sp.x + 4, sp.y - 6);
  ctx.closePath();
  ctx.fill();

  // White dot in centre
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sp.x, sp.y - size / 2, size / 5, 0, Math.PI * 2);
  ctx.fill();

  // If the comment has text, draw a small speech-bubble preview next to the pin
  const raw = a.meta.text ?? '';
  if (!raw) return;
  const text = desanitiseText(raw);

  const fontSize = Math.max(10, 12 * zoom);
  ctx.font = `${fontSize}px Arial, sans-serif`;

  // Truncate long text for preview
  const maxChars = 40;
  const preview = text.length > maxChars ? text.slice(0, maxChars) + '…' : text;

  const padding = 5;
  const measured = ctx.measureText(preview).width;
  const bw = measured + padding * 2;
  const bh = fontSize + padding * 2;
  const bx = sp.x + 14;
  const by = sp.y - size - bh / 2;

  // Bubble background
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = pinColor;
  ctx.lineWidth = 1.5;
  const r = 4;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  ctx.lineTo(bx + r, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Bubble text
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#222';
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(preview, bx + padding, by + bh / 2);
  ctx.restore();
}

function paintLine(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  opts: PaintOptions,
  withArrow: boolean
): void {
  if (a.geometry.kind !== 'line') return;
  const { zoom, panX, panY } = opts;
  const s = toScreenPt(a.geometry.startPoint, zoom, panX, panY);
  const e = toScreenPt(a.geometry.endPoint, zoom, panX, panY);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();

  if (withArrow || a.geometry.hasArrowHead) {
    paintArrowHead(ctx, s, e, a.style.strokeColor, a.style.strokeWidth * zoom);
  }
  if (a.geometry.hasArrowTail) {
    paintArrowHead(ctx, e, s, a.style.strokeColor, a.style.strokeWidth * zoom);
  }
}

function paintArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point, to: Point,
  color: string,
  lineWidth: number
): void {
  const headLen = Math.max(12, lineWidth * 4);
  const { left, right } = arrowHead(from, to, headLen);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ─── Selection handles ────────────────────────────────────────────────────────

const HANDLE_SIZE = 8;
const HANDLE_FILL = '#ffffff';
const HANDLE_STROKE = '#0066FF';
const SEL_STROKE = '#0066FF';

export function paintSelectionBorder(
  ctx: CanvasRenderingContext2D,
  screenRect: ScreenRect
): void {
  ctx.save();
  ctx.strokeStyle = SEL_STROKE;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(
    screenRect.x - 1, screenRect.y - 1,
    screenRect.width + 2, screenRect.height + 2
  );
  ctx.restore();
}

export function paintSelectionHandles(
  ctx: CanvasRenderingContext2D,
  screenRect: ScreenRect
): void {
  const { x, y, width: w, height: h } = screenRect;
  const cx = x + w / 2, cy = y + h / 2;
  const handles: [number, number][] = [
    [x, y], [cx, y], [x + w, y],
    [x + w, cy],
    [x + w, y + h], [cx, y + h], [x, y + h],
    [x, cy],
  ];

  ctx.save();
  for (const [hx, hy] of handles) {
    ctx.fillStyle = HANDLE_FILL;
    ctx.strokeStyle = HANDLE_STROKE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.rect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Text wrap utility ────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    if (!paragraph) lines.push('');
  }
  return lines;
}
