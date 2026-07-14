import type { ViewportAdapter, ViewportTransform, PageInfo, Point } from '@adticorp/annot-core';

/**
 * Adapter for rendered email / HTML content.
 * The overlay is positioned absolutely over the rendered content block;
 * pan starts at 0,0 (overlay top-left = content top-left).
 */
export class EmailViewportAdapter implements ViewportAdapter {
  private _docW: number;
  private _docH: number;
  private _zoom = 1;
  private readonly listeners: Array<() => void> = [];

  constructor(docWidth = 800, docHeight = 1200) {
    this._docW = docWidth;
    this._docH = docHeight;
  }

  setDocSize(w: number, h: number): void {
    this._docW = w;
    this._docH = h;
    this.notify();
  }

  setZoom(zoom: number): void {
    this._zoom = Math.max(0.25, Math.min(4, zoom));
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
    return { width: this._docW, height: this._docH, screenOffsetX: 0, screenOffsetY: 0 };
  }

  getActivePageIndex(): number { return 0; }
  getVisiblePageIndices(): ReadonlyArray<number> { return [0]; }

  onViewportChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { const i = this.listeners.indexOf(listener); if (i !== -1) this.listeners.splice(i, 1); };
  }

  private notify(): void { for (const l of this.listeners) l(); }
}
