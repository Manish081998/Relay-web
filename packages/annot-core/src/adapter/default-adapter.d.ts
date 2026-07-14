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
export declare class SingleSurfaceAdapter implements ViewportAdapter {
    private readonly docWidth;
    private readonly docHeight;
    private readonly getTransformFn;
    private viewportListeners;
    constructor(opts: SingleSurfaceAdapterOptions);
    getViewportTransform(): ViewportTransform;
    screenToDoc(screenPoint: Point, _pageIndex: number): Point;
    docToScreen(docPoint: Point, _pageIndex: number): Point;
    getPageInfo(_pageIndex: number): PageInfo;
    getActivePageIndex(): number;
    getVisiblePageIndices(): ReadonlyArray<number>;
    onViewportChange(listener: () => void): () => void;
    /** Call this whenever zoom/pan/rotation changes in the host */
    notifyViewportChanged(): void;
}
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
export declare class MultiPageScrollAdapter implements ViewportAdapter {
    private readonly pages;
    private readonly pageGap;
    private readonly getTransformFn;
    private viewportListeners;
    constructor(opts: MultiPageAdapterOptions);
    getViewportTransform(): ViewportTransform;
    private pageScreenOffsetY;
    screenToDoc(screenPoint: Point, pageIndex: number): Point;
    docToScreen(docPoint: Point, pageIndex: number): Point;
    getPageInfo(pageIndex: number): PageInfo;
    getActivePageIndex(): number;
    getVisiblePageIndices(): ReadonlyArray<number>;
    onViewportChange(listener: () => void): () => void;
    notifyViewportChanged(): void;
}
//# sourceMappingURL=default-adapter.d.ts.map