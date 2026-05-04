/**
 * @file viewport-adapter.interface.ts
 * The adapter interface that decouples the annotation library from any
 * specific document renderer.
 *
 * HOST RESPONSIBILITY
 * The host application (PDF viewer, image viewer, etc.) implements this
 * interface and passes an instance to the annotator.  The library will
 * never directly access the PDF/image – it only calls these methods to:
 *  - Convert between document ↔ screen coordinate spaces
 *  - Know the current viewport transform (zoom, pan, rotation)
 *  - Know the size of each page/surface
 *
 * COORDINATE CONVENTION
 * • Document coordinates: native units of the document
 *   (e.g. PDF user units, image pixels from top-left).
 * • Screen coordinates: CSS pixels relative to the annotation
 *   overlay's top-left corner.
 */

import type { Point, Rect } from '../model/annotation.model.js';

// ─── Viewport transform ───────────────────────────────────────────────────────

export interface ViewportTransform {
  /** Current zoom level (1 = 100%) */
  readonly zoom: number;
  /** Pan offset in screen pixels – how far the document origin
   *  has moved from the overlay's top-left */
  readonly panX: number;
  readonly panY: number;
  /** Rotation in degrees (0, 90, 180, 270) */
  readonly rotation: 0 | 90 | 180 | 270;
}

// ─── Page info ────────────────────────────────────────────────────────────────

export interface PageInfo {
  /** Page width in document units */
  readonly width: number;
  /** Page height in document units */
  readonly height: number;
  /** Where the page top-left sits in screen pixels relative to the overlay */
  readonly screenOffsetX: number;
  readonly screenOffsetY: number;
}

// ─── Adapter interface ────────────────────────────────────────────────────────

export interface ViewportAdapter {
  /**
   * Return the current viewport transform.
   * Called on every render frame and pointer event.
   */
  getViewportTransform(): ViewportTransform;

  /**
   * Convert a screen-space point to document-space for the given page.
   * @param screenPoint  CSS pixel position relative to the overlay element
   * @param pageIndex    Which page to resolve coordinates for
   */
  screenToDoc(screenPoint: Point, pageIndex: number): Point;

  /**
   * Convert a document-space point to screen-space for the given page.
   * @param docPoint   Point in document coordinates
   * @param pageIndex  Which page the point belongs to
   */
  docToScreen(docPoint: Point, pageIndex: number): Point;

  /**
   * Return layout info for the given page.
   * Used by the renderer to position the annotation overlay per-page.
   */
  getPageInfo(pageIndex: number): PageInfo;

  /** Return the index of the page currently most visible in the viewport */
  getActivePageIndex(): number;

  /**
   * Return all page indices that currently have (at least partial) overlap
   * with the viewport.  Used for incremental rendering.
   */
  getVisiblePageIndices(): ReadonlyArray<number>;

  /**
   * (Optional) Subscribe to viewport change events so the renderer
   * can invalidate and redraw on zoom/pan/scroll.
   * Returns an unsubscribe function.
   */
  onViewportChange?(listener: () => void): () => void;
}

// ─── Selection region helper ──────────────────────────────────────────────────

/** Convert a screen-space rect to document-space rect for the given page */
export function screenRectToDoc(
  adapter: ViewportAdapter,
  screenRect: Rect,
  pageIndex: number
): Rect {
  const tl = adapter.screenToDoc({ x: screenRect.x, y: screenRect.y }, pageIndex);
  const br = adapter.screenToDoc(
    { x: screenRect.x + screenRect.width, y: screenRect.y + screenRect.height },
    pageIndex
  );
  return {
    x: Math.min(tl.x, br.x),
    y: Math.min(tl.y, br.y),
    width: Math.abs(br.x - tl.x),
    height: Math.abs(br.y - tl.y),
  };
}
