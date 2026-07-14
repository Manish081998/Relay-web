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
const IDENTITY_TRANSFORM = {
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
};
export class SingleSurfaceAdapter {
    docWidth;
    docHeight;
    getTransformFn;
    viewportListeners = [];
    constructor(opts) {
        this.docWidth = opts.docWidth;
        this.docHeight = opts.docHeight;
        this.getTransformFn = opts.getTransform ?? (() => IDENTITY_TRANSFORM);
    }
    getViewportTransform() {
        return this.getTransformFn();
    }
    screenToDoc(screenPoint, _pageIndex) {
        const { zoom, panX, panY, rotation } = this.getViewportTransform();
        // Remove pan, then un-zoom
        const unzoomed = {
            x: (screenPoint.x - panX) / zoom,
            y: (screenPoint.y - panY) / zoom,
        };
        return rotatePointInverse(unzoomed, rotation, this.docWidth, this.docHeight);
    }
    docToScreen(docPoint, _pageIndex) {
        const { zoom, panX, panY, rotation } = this.getViewportTransform();
        const rotated = rotatePoint(docPoint, rotation, this.docWidth, this.docHeight);
        return {
            x: rotated.x * zoom + panX,
            y: rotated.y * zoom + panY,
        };
    }
    getPageInfo(_pageIndex) {
        return {
            width: this.docWidth,
            height: this.docHeight,
            screenOffsetX: 0,
            screenOffsetY: 0,
        };
    }
    getActivePageIndex() { return 0; }
    getVisiblePageIndices() { return [0]; }
    onViewportChange(listener) {
        this.viewportListeners.push(listener);
        return () => {
            this.viewportListeners = this.viewportListeners.filter(l => l !== listener);
        };
    }
    /** Call this whenever zoom/pan/rotation changes in the host */
    notifyViewportChanged() {
        for (const l of this.viewportListeners)
            l();
    }
}
export class MultiPageScrollAdapter {
    pages;
    pageGap;
    getTransformFn;
    viewportListeners = [];
    constructor(opts) {
        this.pages = opts.pages;
        this.pageGap = opts.pageGap ?? 16;
        this.getTransformFn = opts.getTransform ?? (() => IDENTITY_TRANSFORM);
    }
    getViewportTransform() {
        return this.getTransformFn();
    }
    pageScreenOffsetY(pageIndex) {
        const { zoom } = this.getViewportTransform();
        let y = 0;
        for (let i = 0; i < pageIndex; i++) {
            y += this.pages[i].height * zoom + this.pageGap;
        }
        return y;
    }
    screenToDoc(screenPoint, pageIndex) {
        const { zoom, panX, panY } = this.getViewportTransform();
        const pageOffY = this.pageScreenOffsetY(pageIndex);
        return {
            x: (screenPoint.x - panX) / zoom,
            y: (screenPoint.y - panY - pageOffY) / zoom,
        };
    }
    docToScreen(docPoint, pageIndex) {
        const { zoom, panX, panY } = this.getViewportTransform();
        const pageOffY = this.pageScreenOffsetY(pageIndex);
        return {
            x: docPoint.x * zoom + panX,
            y: docPoint.y * zoom + panY + pageOffY,
        };
    }
    getPageInfo(pageIndex) {
        const page = this.pages[pageIndex];
        const { zoom, panX, panY } = this.getViewportTransform();
        return {
            width: page.width,
            height: page.height,
            screenOffsetX: panX,
            screenOffsetY: panY + this.pageScreenOffsetY(pageIndex),
        };
    }
    getActivePageIndex() {
        // Return page most visible (simplistic: page whose top is closest to viewport top)
        const { panY, zoom } = this.getViewportTransform();
        let minDist = Infinity;
        let best = 0;
        for (let i = 0; i < this.pages.length; i++) {
            const screenTop = this.pageScreenOffsetY(i) + panY;
            const dist = Math.abs(screenTop);
            if (dist < minDist) {
                minDist = dist;
                best = i;
            }
        }
        return best;
    }
    getVisiblePageIndices() {
        // All pages – host should filter by viewport bounds if needed
        return this.pages.map((_, i) => i);
    }
    onViewportChange(listener) {
        this.viewportListeners.push(listener);
        return () => { this.viewportListeners = this.viewportListeners.filter(l => l !== listener); };
    }
    notifyViewportChanged() {
        for (const l of this.viewportListeners)
            l();
    }
}
// ─── Rotation helpers ─────────────────────────────────────────────────────────
function rotatePoint(p, rotation, w, h) {
    switch (rotation) {
        case 0: return p;
        case 90: return { x: h - p.y, y: p.x };
        case 180: return { x: w - p.x, y: h - p.y };
        case 270: return { x: p.y, y: w - p.x };
    }
}
function rotatePointInverse(p, rotation, w, h) {
    switch (rotation) {
        case 0: return p;
        case 90: return { x: p.y, y: h - p.x };
        case 180: return { x: w - p.x, y: h - p.y };
        case 270: return { x: w - p.y, y: p.x };
    }
}
//# sourceMappingURL=default-adapter.js.map