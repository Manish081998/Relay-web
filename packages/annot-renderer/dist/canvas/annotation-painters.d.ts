/**
 * @file annotation-painters.ts
 * Stateless painter functions – each takes a CanvasRenderingContext2D and
 * an Annotation (in screen coordinates after transform) and paints it.
 *
 * Painters operate in screen-space: callers are expected to pre-multiply
 * the document-to-screen transform.  Each function saves/restores the
 * canvas state so they can be called in any order.
 */
import type { Annotation } from '@adticorp/annot-core';
/** A screen-space rect (already converted from doc coords) */
interface ScreenRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface PaintOptions {
    zoom: number;
    panX: number;
    panY: number;
    isSelected?: boolean;
}
/** Paint a single annotation onto the given canvas context */
export declare function paintAnnotation(ctx: CanvasRenderingContext2D, a: Annotation, opts: PaintOptions): void;
export declare function paintSelectionBorder(ctx: CanvasRenderingContext2D, screenRect: ScreenRect): void;
export declare function paintSelectionHandles(ctx: CanvasRenderingContext2D, screenRect: ScreenRect): void;
export {};
//# sourceMappingURL=annotation-painters.d.ts.map