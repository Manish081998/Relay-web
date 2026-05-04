/**
 * @file layer-manager.ts
 * Manages a stack of Canvas 2D layers overlaid on the host document.
 *
 * LAYER ARCHITECTURE
 * Three canvas elements are stacked using CSS position:absolute.
 * This isolates expensive static redraws from cheap per-frame overlays:
 *
 *  ┌─────────────────────────────────┐  z=3  overlay-layer
 *  │  In-progress draw / cursor ink  │       (cleared & redrawn every RAF)
 *  ├─────────────────────────────────┤  z=2  selection-layer
 *  │  Selected annotation + handles  │       (redrawn when selection changes)
 *  ├─────────────────────────────────┤  z=1  base-layer
 *  │  All non-selected annotations   │       (redrawn when store changes)
 *  ├─────────────────────────────────┤  z=0  host content (PDF/image/HTML)
 *  └─────────────────────────────────┘
 *
 * HIGH-DPI
 * Each canvas is sized at devicePixelRatio × CSS dimensions and scaled
 * via CSS so 1 CSS pixel = 1 logical pixel in JS.
 * The canvas context is scaled by dpr so all drawing uses CSS pixels.
 *
 * OFFSCREEN CANVAS
 * When OffscreenCanvas + transferControlToOffscreen is available and the
 * host is not cross-origin, the base-layer uses a worker-offscreen render
 * for the heaviest redraws.  Falls back to main-thread synchronously.
 */
export interface CanvasLayer {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly name: string;
}
export interface LayerManagerOptions {
    /** Parent element that will contain the canvas stack */
    container: HTMLElement;
    /** Initial logical width in CSS pixels */
    width: number;
    /** Initial logical height in CSS pixels */
    height: number;
}
export declare class LayerManager {
    private readonly container;
    private readonly dpr;
    private width;
    private height;
    readonly base: CanvasLayer;
    readonly selection: CanvasLayer;
    readonly overlay: CanvasLayer;
    constructor(opts: LayerManagerOptions);
    private applyContainerStyle;
    private createLayer;
    private setCanvasSize;
    /** Resize all layers – call when the container changes size */
    resize(width: number, height: number): void;
    /** Clear a single layer */
    clear(layer: CanvasLayer): void;
    /** Clear all layers */
    clearAll(): void;
    /** Detach all canvases – call on component destroy */
    destroy(): void;
    get logicalWidth(): number;
    get logicalHeight(): number;
}
//# sourceMappingURL=layer-manager.d.ts.map