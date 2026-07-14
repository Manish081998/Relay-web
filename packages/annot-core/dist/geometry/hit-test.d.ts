/**
 * @file hit-test.ts
 * Hit-testing for all annotation types in document coordinates.
 *
 * Design: each test is a pure function so it can be unit-tested
 * without any rendering context.  A two-phase approach is used:
 *  1. AABB quick-reject (cheap)
 *  2. Type-specific precise test (more expensive)
 *
 * All tolerance values are in document units; the caller should
 * convert a screen-pixel tolerance to document units using the
 * current zoom level before calling these functions.
 */
import type { Annotation, Point } from '../model/annotation.model.js';
/** Default hit-test tolerance in document units (caller should scale by 1/zoom) */
export declare const DEFAULT_HIT_TOLERANCE = 8;
/** Handle pick radius in document units */
export declare const HANDLE_HIT_RADIUS = 10;
import type { HandleIndex } from './geometry.js';
import type { Rect } from '../model/annotation.model.js';
/**
 * Returns the handle index (0-7) if point p is within HANDLE_HIT_RADIUS
 * of any of the 8 resize handles of rect r, else null.
 */
export declare function hitTestHandle(p: Point, r: Rect, radius?: number): HandleIndex | null;
export interface HitTestResult {
    readonly hit: boolean;
    readonly annotation: Annotation;
}
/**
 * Test whether point p hits annotation a.
 * @param p       Point in document coordinates
 * @param a       Annotation to test
 * @param tol     Tolerance in document units (expand hit area by this amount)
 */
export declare function hitTestAnnotation(p: Point, a: Annotation, tol?: number): boolean;
/** Get the bounding rect of any annotation for quick-reject */
export declare function getAnnotationBounds(a: Annotation): Rect | null;
/**
 * Hit-test all annotations and return those that p falls within,
 * sorted so the topmost (last-drawn) annotation comes first.
 */
export declare function hitTestAll(p: Point, annotations: ReadonlyArray<Annotation>, tol?: number): Annotation[];
/**
 * Returns true if the selection lasso rect intersects the annotation.
 */
export declare function hitTestLasso(lasso: Rect, a: Annotation): boolean;
/**
 * Compute a unified bounding rect for a set of annotations.
 */
export declare function selectionBounds(annotations: ReadonlyArray<Annotation>): Rect | null;
//# sourceMappingURL=hit-test.d.ts.map