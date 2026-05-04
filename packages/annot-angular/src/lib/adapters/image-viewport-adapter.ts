import type { ViewportAdapter, ViewportTransform, PageInfo, Point } from '@adticorp/annot-core';

/**
 * Adapter for <img> content. Overlay is expected to be positioned directly
 * over the image with the same rendered dimensions, so panX/panY are always 0.
 * Call setRenderedSize() after image load and on every zoom change.
 */
export class ImageViewportAdapter implements ViewportAdapter {
  private _naturalW: number;
  private _naturalH: number;
  private _zoom = 1;
  private readonly listeners: Array<() => void> = [];

  constructor(naturalW = 800, naturalH = 600) {
    this._naturalW = naturalW;
    this._naturalH = naturalH;
  }

  /** Call when the image loads or the rendered size changes. */
  setRenderedSize(renderedW: number, naturalW: number, naturalH: number): void {
    this._naturalW = naturalW;
    this._naturalH = naturalH;
    this._zoom = naturalW > 0 ? renderedW / naturalW : 1;
    this.notify();
  }

  setNaturalSize(w: number, h: number): void {
    this._naturalW = w;
    this._naturalH = h;
    this.notify();
  }

  getViewportTransform(): ViewportTransform {
    return { zoom: this._zoom, panX: 0, panY: 0, rotation: 0 };
  }

  screenToDoc(pt: Point, _pi: number): Point {
    return { x: pt.x / this._zoom, y: pt.y / this._zoom };
  }

  docToScreen(pt: Point, _pi: number): Point {
    return { x: pt.x * this._zoom, y: pt.y * this._zoom };
  }

  getPageInfo(_pi: number): PageInfo {
    return { width: this._naturalW, height: this._naturalH, screenOffsetX: 0, screenOffsetY: 0 };
  }

  getActivePageIndex(): number { return 0; }
  getVisiblePageIndices(): ReadonlyArray<number> { return [0]; }

  onViewportChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { const i = this.listeners.indexOf(listener); if (i !== -1) this.listeners.splice(i, 1); };
  }

  private notify(): void { for (const l of this.listeners) l(); }
}
