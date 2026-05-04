/**
 * Canvas-based annotation flattener for images.
 * Composites the original image and all annotations into a single PNG.
 *
 * Coordinate notes
 * ─────────────────
 * Annotation coordinates are stored in "doc space" = image pixel space (1:1
 * with the natural image dimensions).  This flattener draws at natural scale,
 * so no coordinate scaling is required.
 */

import type { Annotation } from '@adticorp/annot-core';
import { desanitiseText } from '@adticorp/annot-core';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Draws the source image + annotations onto an offscreen canvas and returns
 * the result as a PNG Blob.
 *
 * @param imgEl        The <img> element that is currently displayed.
 * @param annotations  Annotations in natural-image coordinate space.
 */
export async function flattenAnnotationsToImage(
  imgEl: HTMLImageElement,
  annotations: ReadonlyArray<Annotation>,
): Promise<Blob> {
  const w = imgEl.naturalWidth;
  const h = imgEl.naturalHeight;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  // Draw base image
  ctx.drawImage(imgEl, 0, 0, w, h);

  // Draw each annotation
  for (const a of annotations) {
    drawAnnotation(ctx, a);
  }

  return canvas.convertToBlob({ type: 'image/png' });
}

// ─── Per-annotation drawing ───────────────────────────────────────────────────

function drawAnnotation(ctx: OffscreenCanvasRenderingContext2D, a: Annotation): void {
  const { style, geometry, type } = a;
  const alpha   = style.opacity ?? 1;
  const fill    = style.fillColor ?? '';
  const stroke  = style.strokeColor ?? '';
  const sw      = style.strokeWidth ?? 1;

  ctx.save();

  switch (type) {

    case 'rectangle': {
      if (geometry.kind !== 'rect') break;
      const { x, y, width, height } = geometry.rect;
      if (fill && fill !== 'transparent') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, width, height);
      }
      if (stroke && stroke !== 'transparent' && sw > 0) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sw;
        ctx.strokeRect(x, y, width, height);
      }
      break;
    }

    case 'ellipse': {
      if (geometry.kind !== 'rect') break;
      const { x, y, width, height } = geometry.rect;
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke && stroke !== 'transparent' && sw > 0) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sw;
        ctx.stroke();
      }
      break;
    }

    case 'highlight': {
      const hlAlpha = extractAlpha(fill, 0.4);
      ctx.globalAlpha = hlAlpha;
      ctx.globalCompositeOperation = 'multiply';
      const c = rgbFromCss(fill);
      if (!c) break;
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      if (geometry.kind === 'rect') {
        const { x, y, width, height } = geometry.rect;
        ctx.fillRect(x, y, width, height);
      } else if (geometry.kind === 'path' && geometry.points.length >= 2) {
        const hlStroke = rgbFromCss(style.strokeColor ?? fill);
        if (!hlStroke) break;
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = `rgb(${hlStroke.r},${hlStroke.g},${hlStroke.b})`;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(geometry.points[0]!.x, geometry.points[0]!.y);
        for (let i = 1; i < geometry.points.length; i++) {
          ctx.lineTo(geometry.points[i]!.x, geometry.points[i]!.y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'freehand': {
      if (geometry.kind !== 'path' || !stroke || geometry.points.length < 2) break;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(geometry.points[0]!.x, geometry.points[0]!.y);
      for (let i = 1; i < geometry.points.length; i++) {
        ctx.lineTo(geometry.points[i]!.x, geometry.points[i]!.y);
      }
      ctx.stroke();
      break;
    }

    case 'line': {
      if (geometry.kind !== 'line' || !stroke) break;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.beginPath();
      ctx.moveTo(geometry.startPoint.x, geometry.startPoint.y);
      ctx.lineTo(geometry.endPoint.x, geometry.endPoint.y);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      if (geometry.kind !== 'line' || !stroke) break;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      const s = geometry.startPoint, e = geometry.endPoint;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      drawArrowHead(ctx, s, e, stroke, sw, alpha);
      if (geometry.hasArrowTail) drawArrowHead(ctx, e, s, stroke, sw, alpha);
      break;
    }

    case 'text': {
      if (geometry.kind !== 'rect') break;
      const { x, y, width, height } = geometry.rect;
      if (fill && fill !== 'transparent') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, width, height);
      }
      const rawText = desanitiseText(a.meta.text ?? '');
      if (rawText) {
        const fs = style.fontSize ?? 14;
        const fc = style.fontColor ?? '#000';
        const pad = 4;
        const lh = fs * 1.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fc;
        ctx.font = `${fs}px Helvetica, Arial, sans-serif`;
        ctx.textBaseline = 'top';
        const chars = Math.max(1, Math.floor((width - pad * 2) / (fs * 0.55)));
        const lines = wrapText(rawText, chars);
        for (let i = 0; i < lines.length; i++) {
          const lineY = y + pad + i * lh;
          if (lineY + fs > y + height) break;
          ctx.fillText(lines[i]!, x + pad, lineY);
        }
      }
      break;
    }

    case 'comment': {
      if (geometry.kind !== 'point') break;
      const { x, y } = geometry.point;
      const pinColor = (fill && fill !== 'transparent') ? fill : 'rgba(0,122,255,1)';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pinColor;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      const rawText = desanitiseText(a.meta.text ?? '');
      if (rawText) {
        const preview = rawText.length > 50 ? rawText.slice(0, 50) + '…' : rawText;
        ctx.fillStyle = 'rgba(28,28,30,0.85)';
        ctx.font = '9px Helvetica,Arial,sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(preview, x + 12, y);
      }
      break;
    }
  }

  ctx.restore();
}

// ─── Arrow head ───────────────────────────────────────────────────────────────

function drawArrowHead(
  ctx: OffscreenCanvasRenderingContext2D,
  from: { x: number; y: number },
  to:   { x: number; y: number },
  color: string, thickness: number, alpha: number,
): void {
  const len   = Math.max(12, thickness * 4);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 6;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - len * Math.cos(angle - spread), to.y - len * Math.sin(angle - spread));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - len * Math.cos(angle + spread), to.y - len * Math.sin(angle + spread));
  ctx.stroke();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAlpha(css: string | undefined, fallback: number): number {
  if (!css) return fallback;
  const m = css.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  return m ? Math.min(1, Math.max(0, parseFloat(m[1]!))) : fallback;
}

function rgbFromCss(css: string | undefined): { r: number; g: number; b: number } | null {
  if (!css || css === 'transparent' || css === 'none' || css === '') return null;
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return { r: +m[1]!, g: +m[2]!, b: +m[3]! };
  if (css.startsWith('#')) {
    const h = css.slice(1);
    const p = h.length === 3
      ? [h[0]! + h[0], h[1]! + h[1], h[2]! + h[2]]
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    return { r: parseInt(p[0]!, 16), g: parseInt(p[1]!, 16), b: parseInt(p[2]!, 16) };
  }
  return null;
}

function wrapText(text: string, charsPerLine: number): string[] {
  const result: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (test.length > charsPerLine && line) { result.push(line); line = word; }
      else { line = test; }
    }
    if (line) result.push(line);
  }
  return result;
}
