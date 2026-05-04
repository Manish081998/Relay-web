/**
 * @file geometry.ts
 * Pure geometry utilities – zero side-effects, fully tree-shakeable.
 * All functions operate in document coordinates unless stated otherwise.
 */
import type { Point, Rect } from '../model/annotation.model.js';
export declare function pt(x: number, y: number): Point;
export declare function addPt(a: Point, b: Point): Point;
export declare function subPt(a: Point, b: Point): Point;
export declare function scalePt(p: Point, s: number): Point;
export declare function distanceSq(a: Point, b: Point): number;
export declare function distance(a: Point, b: Point): number;
export declare function midPoint(a: Point, b: Point): Point;
export declare function clampPt(p: Point, bounds: Rect): Point;
/** Normalise a point angle to degrees 0..360 */
export declare function pointAngleDeg(from: Point, to: Point): number;
/** Create a Rect ensuring positive width/height regardless of point order */
export declare function rectFromPoints(a: Point, b: Point): Rect;
export declare function rectCenter(r: Rect): Point;
export declare function rectContainsPoint(r: Rect, p: Point): boolean;
export declare function rectsIntersect(a: Rect, b: Rect): boolean;
export declare function rectUnion(a: Rect, b: Rect): Rect;
export declare function rectInflate(r: Rect, amount: number): Rect;
export declare function rectTranslate(r: Rect, dx: number, dy: number): Rect;
/** Grow/shrink a rect by dragging one of its 8 handles */
export type HandleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
/**
 * Handle layout (clockwise from TL):
 *  0=TL, 1=TC, 2=TR, 3=MR, 4=BR, 5=BC, 6=BL, 7=ML
 */
export declare function rectResizeByHandle(original: Rect, handle: HandleIndex, delta: Point): Rect;
/** The 8 handle positions for a given rect (in same coord space) */
export declare function rectHandlePoints(r: Rect): [Point, Point, Point, Point, Point, Point, Point, Point];
/** Compute bounding rect for an array of points */
export declare function pointsBounds(points: ReadonlyArray<Point>): Rect;
/**
 * Minimum distance (squared) from point p to segment [a, b].
 * Cheaper than computing square root – use only for threshold comparisons.
 */
export declare function pointToSegmentDistanceSq(p: Point, a: Point, b: Point): number;
/** Douglas–Peucker polyline simplification */
export declare function simplifyPath(points: ReadonlyArray<Point>, tolerance: number): Point[];
/**
 * Is point p inside the ellipse inscribed in rect r?
 * Uses normalised ellipse equation: ((x-cx)/rx)² + ((y-cy)/ry)² <= 1
 */
export declare function pointInEllipse(p: Point, r: Rect): boolean;
/**
 * Minimum distance from point p to the ellipse perimeter (approximate).
 * Uses parameterised sampling – fast enough for hit-testing.
 */
export declare function pointToEllipseEdgeDistanceSq(p: Point, r: Rect, samples?: number): number;
export interface ArrowHeadPoints {
    readonly tip: Point;
    readonly left: Point;
    readonly right: Point;
}
/** Compute the three points of an arrowhead triangle */
export declare function arrowHead(from: Point, to: Point, headLength?: number, halfAngle?: number): ArrowHeadPoints;
//# sourceMappingURL=geometry.d.ts.map