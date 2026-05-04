import type { ViewportAdapter, ViewportTransform, PageInfo, Point } from '@adticorp/annot-core';

export interface PdfPageLayout {
  readonly docWidth: number;
  readonly docHeight: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
}

export class PdfViewportAdapter implements ViewportAdapter {
  private pages: PdfPageLayout[] = [];
  private _zoom = 1;
  private _activePage = 0;
  private readonly listeners: Array<() => void> = [];

  setPageLayouts(layouts: PdfPageLayout[]): void {
    this.pages = layouts;
    if (layouts.length > 0) {
      this._zoom = layouts[0].screenWidth / layouts[0].docWidth;
    }
    this.notify();
  }

  setActivePage(idx: number): void { this._activePage = idx; }

  getViewportTransform(): ViewportTransform {
    return { zoom: this._zoom, panX: 0, panY: 0, rotation: 0 };
  }

  screenToDoc(pt: Point, pageIndex: number): Point {
    const p = this.pages[pageIndex];
    if (!p) return pt;
    return { x: (pt.x - p.screenX) / this._zoom, y: (pt.y - p.screenY) / this._zoom };
  }

  docToScreen(pt: Point, pageIndex: number): Point {
    const p = this.pages[pageIndex];
    if (!p) return pt;
    return { x: pt.x * this._zoom + p.screenX, y: pt.y * this._zoom + p.screenY };
  }

  getPageInfo(pageIndex: number): PageInfo {
    const p = this.pages[pageIndex];
    if (!p) return { width: 0, height: 0, screenOffsetX: 0, screenOffsetY: 0 };
    return { width: p.docWidth, height: p.docHeight, screenOffsetX: p.screenX, screenOffsetY: p.screenY };
  }

  getActivePageIndex(): number { return this._activePage; }
  getVisiblePageIndices(): ReadonlyArray<number> { return this.pages.map((_, i) => i); }

  onViewportChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { const i = this.listeners.indexOf(listener); if (i !== -1) this.listeners.splice(i, 1); };
  }

  private notify(): void { for (const l of this.listeners) l(); }
}
