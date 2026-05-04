/**
 * @file pdf-flattener.ts
 * Burns annotation data into a PDF using pdf-lib.
 *
 * Coordinate notes
 * ────────────────
 * Annotation space: one virtual tall page, top-left origin (y ↓).
 * PDF space: per-page origin at bottom-left (y ↑).
 *
 * For a page of height H (actual PDF points, not hard-coded):
 *   pdfY = H - localY          (point)
 *   pdfY = H - localY - height (bottom-left corner of a rect)
 *
 * Multi-page: cumulative Y offsets are computed from each page's real height,
 * so the library works with any PDF size (A4, Letter, custom).
 */

import {
  PDFDocument, rgb, StandardFonts, LineCapStyle, BlendMode,
  PDFName, PDFNumber, PDFOperator,
  pushGraphicsState, popGraphicsState,
} from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { Annotation } from '@adticorp/annot-core';
import { desanitiseText } from '@adticorp/annot-core';

// pdf-lib types PDFOperator.of() to only accept PDFOperatorNames enum values,
// but the enum doesn't cover every valid PDF operator (e.g. 'gs', 're', 'f').
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfOp = (name: string, args: any[] = []): PDFOperator => PDFOperator.of(name as any, args);

// ─── Color helpers ────────────────────────────────────────────────────────────

interface Rgb { r: number; g: number; b: number; }

function parseRgb(css: string | undefined): Rgb | null {
  if (!css || css === 'transparent' || css === 'none' || css === '') return null;
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255 };
  if (css.startsWith('#')) {
    const h = css.slice(1);
    const p = h.length === 3
      ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]]
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    return { r: parseInt(p[0]!, 16) / 255, g: parseInt(p[1]!, 16) / 255, b: parseInt(p[2]!, 16) / 255 };
  }
  return null;
}

function parseAlpha(css: string | undefined, fallback: number): number {
  if (!css) return fallback;
  const m = css.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  return m ? Math.min(1, Math.max(0, parseFloat(m[1]!))) : fallback;
}

function toRgb(c: Rgb) { return rgb(c.r, c.g, c.b); }

// ─── Highlight graphics state ─────────────────────────────────────────────────
//
// Highlights use Multiply blend mode to preserve dark text (text stays
// black/readable under the tint).  We use page.node.newExtGState() which
// correctly resolves the page's Resources even when it is stored as an
// indirect PDFRef in loaded PDFs — the previous manual approach using
// page.node.get('Resources') as PDFDict was silently failing for such PDFs,
// causing the highlight to render at full opacity and obscure the text.

function addHighlightGS(page: PDFPage, doc: PDFDocument, alpha: number): PDFName {
  const gsDict = doc.context.obj({
    Type: 'ExtGState',
    BM: PDFName.of('Multiply'),
    ca: PDFNumber.of(alpha),
    CA: PDFNumber.of(alpha),
  });
  return page.node.newExtGState('GsHL', gsDict);
}

/** Raw PDF operators for fill / stroke color (avoids pdf-lib version variance) */
function rg(c: Rgb): PDFOperator {
  return pdfOp('rg', [PDFNumber.of(c.r), PDFNumber.of(c.g), PDFNumber.of(c.b)]);
}
function RG(c: Rgb): PDFOperator {
  return pdfOp('RG', [PDFNumber.of(c.r), PDFNumber.of(c.g), PDFNumber.of(c.b)]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the real width/height (in PDF points) for each page in the document. */
export async function getPdfPageDimensions(
  pdfBytes: ArrayBuffer,
): Promise<Array<{ width: number; height: number }>> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPages().map(p => ({ width: p.getWidth(), height: p.getHeight() }));
}

export async function flattenAnnotationsToPdf(
  pdfBytes: ArrayBuffer,
  annotations: ReadonlyArray<Annotation>,
): Promise<Uint8Array> {
  const doc   = await PDFDocument.load(pdfBytes);
  const font  = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  // Compute cumulative Y offsets per page from actual PDF page heights.
  // Annotation coordinates are stored in this stacked virtual space.
  const pageHeights = pages.map(p => p.getHeight());
  const pageOffsets: number[] = [];
  let cumY = 0;
  for (const h of pageHeights) {
    pageOffsets.push(cumY);
    cumY += h;
  }

  // Find which physical page a virtual-space docY coordinate belongs to.
  function physPage(docY: number): number {
    let pg = 0;
    for (let i = 0; i < pageOffsets.length; i++) {
      if (docY >= pageOffsets[i]!) pg = i;
    }
    return pg;
  }

  for (const a of annotations) {
    const topY   = getPrimaryDocY(a);
    const pgIdx  = Math.min(physPage(topY), pages.length - 1);
    drawAnnotation(pages[pgIdx]!, a, pageOffsets[pgIdx]!, pageHeights[pgIdx]!, font, doc);
  }

  return doc.save();
}

// ─── Primary doc-Y for page assignment ───────────────────────────────────────

function getPrimaryDocY(a: Annotation): number {
  const g = a.geometry;
  switch (g.kind) {
    case 'rect':  return g.rect.y;
    case 'path':  return g.bounds.y;
    case 'point': return g.point.y;
    case 'line':  return Math.min(g.startPoint.y, g.endPoint.y);
    default:      return 0;
  }
}

// ─── Draw one annotation onto a PDFPage ──────────────────────────────────────

function drawAnnotation(
  page: PDFPage,
  a: Annotation,
  pageOffsetY: number,
  pageHeight: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  doc: PDFDocument,
): void {
  const { style, geometry, type } = a;
  const opacity = style.opacity ?? 1;
  const fill    = parseRgb(style.fillColor);
  const stroke  = parseRgb(style.strokeColor);
  const sw      = style.strokeWidth ?? 1;

  // Effective alpha: multiply style.opacity by any alpha baked into the CSS color
  // string.  e.g. fillColor='rgba(255,59,48,0.2)' with opacity:1 must produce
  // a 0.2-opacity fill in the PDF, not a 1.0-opacity fill.
  const fillAlpha   = parseAlpha(style.fillColor,   1) * opacity;
  const strokeAlpha = parseAlpha(style.strokeColor, 1) * opacity;

  // Convert from virtual (top-down) doc space to PDF (bottom-up) page space.
  const py = (docY: number, h = 0) => pageHeight - (docY - pageOffsetY) - h;

  switch (type) {

    // ── Rectangle ────────────────────────────────────────────────────────────
    case 'rectangle': {
      if (geometry.kind !== 'rect') break;
      const { x, y, width, height } = geometry.rect;
      page.drawRectangle({
        x, y: py(y, height), width, height,
        ...(fill   ? { color: toRgb(fill), opacity: fillAlpha }                                           : {}),
        ...(stroke ? { borderColor: toRgb(stroke), borderWidth: sw, borderOpacity: strokeAlpha } : { borderWidth: 0 }),
      });
      break;
    }

    // ── Ellipse ───────────────────────────────────────────────────────────────
    case 'ellipse': {
      if (geometry.kind !== 'rect') break;
      const { x, y, width, height } = geometry.rect;
      page.drawEllipse({
        x: x + width / 2,
        y: py(y) - height / 2,
        xScale: Math.max(width / 2, 0.5),
        yScale: Math.max(height / 2, 0.5),
        ...(fill   ? { color: toRgb(fill), opacity: fillAlpha }                                           : {}),
        ...(stroke ? { borderColor: toRgb(stroke), borderWidth: sw, borderOpacity: strokeAlpha } : { borderWidth: 0 }),
      });
      break;
    }

    // ── Highlight ─────────────────────────────────────────────────────────────
    // Multiply blend mode preserves dark text (black text stays black under
    // the tint).  addHighlightGS() uses page.node.newExtGState() which
    // correctly modifies the Resources dict even when it is an indirect ref.
    case 'highlight': {
      const alpha = parseAlpha(style.fillColor, 0.4);

      if (geometry.kind === 'rect' && fill) {
        // Use pdf-lib's high-level API — it handles ExtGState registration
        // internally and avoids the indirect-ref pitfall entirely.
        const { x, y, width, height } = geometry.rect;
        page.drawRectangle({
          x, y: py(y, height), width, height,
          color: toRgb(fill),
          opacity: alpha,
          blendMode: BlendMode.Multiply,
          borderWidth: 0,
        });
      } else if (geometry.kind === 'path') {
        const c = parseRgb(style.strokeColor ?? style.fillColor);
        if (!c || geometry.points.length < 2) break;
        // Register ExtGState via pdf-lib's internal API (handles indirect refs).
        // Build one continuous path and stroke it once — stroking each segment
        // individually causes overlapping round caps that darken under Multiply.
        const gsKey = addHighlightGS(page, doc, alpha);
        const first = geometry.points[0]!;
        const pathOps = [
          pushGraphicsState(),
          pdfOp('gs', [gsKey]),
          RG(c),
          pdfOp('w', [PDFNumber.of(sw)]),
          pdfOp('J', [PDFNumber.of(1)]),
          pdfOp('j', [PDFNumber.of(1)]),
          pdfOp('m', [PDFNumber.of(first.x), PDFNumber.of(py(first.y))]),
        ];
        for (let i = 1; i < geometry.points.length; i++) {
          const p = geometry.points[i]!;
          pathOps.push(pdfOp('l', [PDFNumber.of(p.x), PDFNumber.of(py(p.y))]));
        }
        pathOps.push(pdfOp('S'), popGraphicsState());
        page.pushOperators(...pathOps);
      }
      break;
    }

    // ── Freehand ──────────────────────────────────────────────────────────────
    case 'freehand': {
      if (geometry.kind !== 'path') break;
      const c = stroke;
      if (!c || geometry.points.length < 2) break;
      for (let i = 0; i < geometry.points.length - 1; i++) {
        const p1 = geometry.points[i]!, p2 = geometry.points[i + 1]!;
        page.drawLine({
          start: { x: p1.x, y: py(p1.y) }, end: { x: p2.x, y: py(p2.y) },
          color: toRgb(c), thickness: sw, opacity: strokeAlpha, lineCap: LineCapStyle.Round,
        });
      }
      break;
    }

    // ── Line ──────────────────────────────────────────────────────────────────
    case 'line': {
      if (geometry.kind !== 'line' || !stroke) break;
      page.drawLine({
        start: { x: geometry.startPoint.x, y: py(geometry.startPoint.y) },
        end:   { x: geometry.endPoint.x,   y: py(geometry.endPoint.y) },
        color: toRgb(stroke), thickness: sw, opacity: strokeAlpha,
      });
      break;
    }

    // ── Arrow ─────────────────────────────────────────────────────────────────
    case 'arrow': {
      if (geometry.kind !== 'line' || !stroke) break;
      const s = { x: geometry.startPoint.x, y: py(geometry.startPoint.y) };
      const e = { x: geometry.endPoint.x,   y: py(geometry.endPoint.y) };
      page.drawLine({ start: s, end: e, color: toRgb(stroke), thickness: sw, opacity: strokeAlpha });
      drawArrowHead(page, s, e, stroke, sw, strokeAlpha);
      if (geometry.hasArrowTail) drawArrowHead(page, e, s, stroke, sw, strokeAlpha);
      break;
    }

    // ── Text ──────────────────────────────────────────────────────────────────
    case 'text': {
      if (geometry.kind !== 'rect') break;
      const { x, y, width, height } = geometry.rect;
      const rectBottom = py(y, height);
      if (fill) {
        page.drawRectangle({
          x, y: rectBottom, width, height,
          color: toRgb(fill), opacity: fillAlpha,
          ...(stroke && sw > 0 ? { borderColor: toRgb(stroke), borderWidth: sw, borderOpacity: strokeAlpha } : { borderWidth: 0 }),
        });
      }
      const rawText = desanitiseText(a.meta.text ?? '');
      if (rawText) {
        const fs = style.fontSize ?? 14;
        const fc = parseRgb(style.fontColor ?? '#000') ?? { r: 0, g: 0, b: 0 };
        const fontAlpha = parseAlpha(style.fontColor, 1) * opacity;
        const pad = 4;
        const lh  = fs * 1.3;
        const lines = wrapText(rawText, width - pad * 2, fs);
        for (let i = 0; i < lines.length; i++) {
          const baseline = py(y) - pad - fs - i * lh;
          if (baseline < rectBottom) break;
          page.drawText(lines[i]!, { x: x + pad, y: baseline, size: fs, font, color: toRgb(fc), opacity: fontAlpha });
        }
      }
      break;
    }

    // ── Comment ───────────────────────────────────────────────────────────────
    case 'comment': {
      if (geometry.kind !== 'point') break;
      const { x, y } = geometry.point;
      const pinColor = fill ?? { r: 0, g: 0.478, b: 1 };
      page.drawCircle({ x, y: py(y), size: 8, color: toRgb(pinColor), opacity: fillAlpha });
      const rawText = desanitiseText(a.meta.text ?? '');
      if (rawText) {
        const preview = rawText.length > 50 ? rawText.slice(0, 50) + '…' : rawText;
        page.drawText(preview, { x: x + 12, y: py(y) - 4, size: 9, font, color: rgb(0.1, 0.1, 0.1), opacity });
      }
      break;
    }
  }
}

// ─── Arrow head ───────────────────────────────────────────────────────────────

function drawArrowHead(
  page: PDFPage,
  from: { x: number; y: number },
  to:   { x: number; y: number },
  color: Rgb, thickness: number, opacity: number,
): void {
  const headLen = Math.max(12, thickness * 4);
  const angle   = Math.atan2(to.y - from.y, to.x - from.x);
  const spread  = Math.PI / 6;
  const left  = { x: to.x - headLen * Math.cos(angle - spread), y: to.y - headLen * Math.sin(angle - spread) };
  const right = { x: to.x - headLen * Math.cos(angle + spread), y: to.y - headLen * Math.sin(angle + spread) };
  const c = toRgb(color);
  page.drawLine({ start: to, end: left,  color: c, thickness, opacity });
  page.drawLine({ start: to, end: right, color: c, thickness, opacity });
}

// ─── Text word-wrap ───────────────────────────────────────────────────────────

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontSize * 0.55)));
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
