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
// ─── Selection region helper ──────────────────────────────────────────────────
/** Convert a screen-space rect to document-space rect for the given page */
export function screenRectToDoc(adapter, screenRect, pageIndex) {
    const tl = adapter.screenToDoc({ x: screenRect.x, y: screenRect.y }, pageIndex);
    const br = adapter.screenToDoc({ x: screenRect.x + screenRect.width, y: screenRect.y + screenRect.height }, pageIndex);
    return {
        x: Math.min(tl.x, br.x),
        y: Math.min(tl.y, br.y),
        width: Math.abs(br.x - tl.x),
        height: Math.abs(br.y - tl.y),
    };
}
//# sourceMappingURL=viewport-adapter.interface.js.map