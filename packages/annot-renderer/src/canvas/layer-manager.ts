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

export class LayerManager {
  private readonly container: HTMLElement;
  private readonly dpr: number;
  private width: number;
  private height: number;

  readonly base: CanvasLayer;
  readonly selection: CanvasLayer;
  readonly overlay: CanvasLayer;

  constructor(opts: LayerManagerOptions) {
    this.container = opts.container;
    this.dpr = Math.max(1, window.devicePixelRatio ?? 1);
    this.width = opts.width;
    this.height = opts.height;

    this.base = this.createLayer('annot-base', 1);
    this.selection = this.createLayer('annot-selection', 2);
    this.overlay = this.createLayer('annot-overlay', 3);

    this.applyContainerStyle();
  }

  private applyContainerStyle(): void {
    const s = this.container.style;
    s.position = 'relative';
    // Container should have overflow:hidden set by Angular component
  }

  private createLayer(name: string, zIndex: number): CanvasLayer {
    const canvas = document.createElement('canvas');
    canvas.dataset['annotLayer'] = name;
    // Overlay canvas (highest z-index) receives pointer events;
    // base and selection layers are transparent to pointer events.
    const pointerEvents = zIndex === 3 ? 'all' : 'none';
    canvas.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: ${pointerEvents};
      z-index: ${zIndex};
    `;

    this.setCanvasSize(canvas, this.width, this.height);
    this.container.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);

    return { canvas, ctx, name };
  }

  private setCanvasSize(canvas: HTMLCanvasElement, w: number, h: number): void {
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  /** Resize all layers – call when the container changes size */
  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;

    for (const layer of [this.base, this.selection, this.overlay]) {
      this.setCanvasSize(layer.canvas, width, height);
      // After resize, context transform is reset – reapply scale
      layer.ctx.scale(this.dpr, this.dpr);
    }
  }

  /** Clear a single layer */
  clear(layer: CanvasLayer): void {
    layer.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** Clear all layers */
  clearAll(): void {
    this.clear(this.base);
    this.clear(this.selection);
    this.clear(this.overlay);
  }

  /** Detach all canvases – call on component destroy */
  destroy(): void {
    for (const layer of [this.base, this.selection, this.overlay]) {
      layer.canvas.remove();
    }
  }

  get logicalWidth(): number { return this.width; }
  get logicalHeight(): number { return this.height; }
}
