/**
 * @file index.ts
 * Public API surface for @company/annot-renderer
 */

export type { LayerManagerOptions, CanvasLayer } from './canvas/layer-manager.js';
export { LayerManager } from './canvas/layer-manager.js';

export type { PaintOptions } from './canvas/annotation-painters.js';
export {
  paintAnnotation,
  paintSelectionBorder,
  paintSelectionHandles,
} from './canvas/annotation-painters.js';

export type { RendererOptions, RendererState } from './canvas/canvas-renderer.js';
export { CanvasRenderer } from './canvas/canvas-renderer.js';

export type { PointerHandlerOptions } from './interaction/pointer-handler.js';
export { PointerHandler } from './interaction/pointer-handler.js';
