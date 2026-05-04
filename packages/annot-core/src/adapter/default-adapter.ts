/**
 * @file default-adapter.ts
 * A default ViewportAdapter for single-surface containers (image, HTML block).
 *
 * Usage: provide a reference to the host element that contains the document
 * being annotated.  The adapter assumes:
 *  - The document fills the host element exactly at zoom=1
 *  - The host element's dimensions equal the document dimensions at zoom=1
 *  - The annotation overlay covers the same area as the host element
 */

import type { Point } from '../model/annotation.model.js';
import type { ViewportAdapter, ViewportTransform, PageInfo } from './viewport-adapter.interface.js';

export interface SingleSurfaceAdapterOptions {
  /** Natural width of the document in document units */
  docWidth: number;
  /** Natural height of the document in document units */
  docHeight: number;
  /**
   * Provide the current viewport transform.
   * If omitted, the adapter uses zoom=1, pan=(0,0), rotation=0.
   */
  getTransform?: () => ViewportTransform;
}

const IDENTITY_TRANSFORM: ViewportTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
};

export class SingleSurfaceAdapter implements ViewportAdapter {
  private readonly docWidth: number;
  private readonly docHeight: number;
  private readonly getTransformFn: () => ViewportTransform;
  private viewportListeners: Array<() => void> = [];

  constructor(opts: SingleSurfaceAdapterOptions) {
    this.docWidth = opts.docWidth;
    this.docHeight = opts.docHeight;
    this.getTransformFn = opts.getTransform ?? (() => IDENTITY_TRANSFORM);
  }

  getViewportTransform(): ViewportTransform {
    return this.getTransformFn();
  }

  screenToDoc(screenPoint: Point, _pageIndex: number): Point {
    const { zoom, panX, panY, rotation } = this.getViewportTransform();
    // Remove pan, then un-zoom
    const unzoomed = {
      x: (screenPoint.x - panX) / zoom,
      y: (screenPoint.y - panY) / zoom,
    };
    return rotatePointInverse(unzoomed, rotation, this.docWidth, this.docHeight);
  }

  docToScreen(docPoint: Point, _pageIndex: number): Point {
    const { zoom, panX, panY, rotation } = this.getViewportTransform();
    const rotated = rotatePoint(docPoint, rotation, this.docWidth, this.docHeight);
    return {
      x: rotated.x * zoom + panX,
      y: rotated.y * zoom + panY,
    };
  }

  getPageInfo(_pageIndex: number): PageInfo {
    return {
      width: this.docWidth,
      height: this.docHeight,
      screenOffsetX: 0,
      screenOffsetY: 0,
    };
  }

  getActivePageIndex(): number { return 0; }

  getVisiblePageIndices(): ReadonlyArray<number> { return [0]; }

  onViewportChange(listener: () => void): () => void {
    this.viewportListeners.push(listener);
    return () => {
      this.viewportListeners = this.viewportListeners.filter(l => l !== listener);
    };
  }

  /** Call this whenever zoom/pan/rotation changes in the host */
  notifyViewportChanged(): void {
    for (const l of this.viewportListeners) l();
  }
}

// ─── Multi-page scroll adapter ────────────────────────────────────────────────

export interface PageLayout {
  readonly width: number;
  readonly height: number;
}

export interface MultiPageAdapterOptions {
  /** Page sizes in document units (one entry per page) */
  pages: ReadonlyArray<PageLayout>;
  /** Gap between pages in screen pixels at zoom=1 */
  pageGap?: number;
  getTransform?: () => ViewportTransform;
}

export class MultiPageScrollAdapter implements ViewportAdapter {
  private readonly pages: ReadonlyArray<PageLayout>;
  private readonly pageGap: number;
  private readonly getTransformFn: () => ViewportTransform;
  private viewportListeners: Array<() => void> = [];

  constructor(opts: MultiPageAdapterOptions) {
    this.pages = opts.pages;
    this.pageGap = opts.pageGap ?? 16;
    this.getTransformFn = opts.getTransform ?? (() => IDENTITY_TRANSFORM);
  }

  getViewportTransform(): ViewportTransform {
    return this.getTransformFn();
  }

  private pageScreenOffsetY(pageIndex: number): number {
    const { zoom } = this.getViewportTransform();
    let y = 0;
    for (let i = 0; i < pageIndex; i++) {
      y += this.pages[i].height * zoom + this.pageGap;
    }
    return y;
  }

  screenToDoc(screenPoint: Point, pageIndex: number): Point {
    const { zoom, panX, panY } = this.getViewportTransform();
    const pageOffY = this.pageScreenOffsetY(pageIndex);
    return {
      x: (screenPoint.x - panX) / zoom,
      y: (screenPoint.y - panY - pageOffY) / zoom,
    };
  }

  docToScreen(docPoint: Point, pageIndex: number): Point {
    const { zoom, panX, panY } = this.getViewportTransform();
    const pageOffY = this.pageScreenOffsetY(pageIndex);
    return {
      x: docPoint.x * zoom + panX,
      y: docPoint.y * zoom + panY + pageOffY,
    };
  }

  getPageInfo(pageIndex: number): PageInfo {
    const page = this.pages[pageIndex];
    const { zoom, panX, panY } = this.getViewportTransform();
    return {
      width: page.width,
      height: page.height,
      screenOffsetX: panX,
      screenOffsetY: panY + this.pageScreenOffsetY(pageIndex),
    };
  }

  getActivePageIndex(): number {
    // Return page most visible (simplistic: page whose top is closest to viewport top)
    const { panY, zoom } = this.getViewportTransform();
    let minDist = Infinity;
    let best = 0;
    for (let i = 0; i < this.pages.length; i++) {
      const screenTop = this.pageScreenOffsetY(i) + panY;
      const dist = Math.abs(screenTop);
      if (dist < minDist) { minDist = dist; best = i; }
    }
    return best;
  }

  getVisiblePageIndices(): ReadonlyArray<number> {
    // All pages – host should filter by viewport bounds if needed
    return this.pages.map((_, i) => i);
  }

  onViewportChange(listener: () => void): () => void {
    this.viewportListeners.push(listener);
    return () => { this.viewportListeners = this.viewportListeners.filter(l => l !== listener); };
  }

  notifyViewportChanged(): void {
    for (const l of this.viewportListeners) l();
  }
}

// ─── Rotation helpers ─────────────────────────────────────────────────────────

function rotatePoint(p: Point, rotation: 0 | 90 | 180 | 270, w: number, h: number): Point {
  switch (rotation) {
    case 0:   return p;
    case 90:  return { x: h - p.y, y: p.x };
    case 180: return { x: w - p.x, y: h - p.y };
    case 270: return { x: p.y, y: w - p.x };
  }
}

function rotatePointInverse(p: Point, rotation: 0 | 90 | 180 | 270, w: number, h: number): Point {
  switch (rotation) {
    case 0:   return p;
    case 90:  return { x: p.y, y: h - p.x };
    case 180: return { x: w - p.x, y: h - p.y };
    case 270: return { x: w - p.y, y: p.x };
  }
}
