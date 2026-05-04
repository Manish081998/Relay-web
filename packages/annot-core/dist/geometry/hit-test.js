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
import { rectContainsPoint, rectInflate, pointToSegmentDistanceSq, pointInEllipse, pointToEllipseEdgeDistanceSq, distanceSq, } from './geometry.js';
// ─── Constants ───────────────────────────────────────────────────────────────
/** Default hit-test tolerance in document units (caller should scale by 1/zoom) */
export const DEFAULT_HIT_TOLERANCE = 8;
/** Handle pick radius in document units */
export const HANDLE_HIT_RADIUS = 10;
import { rectHandlePoints } from './geometry.js';
/**
 * Returns the handle index (0-7) if point p is within HANDLE_HIT_RADIUS
 * of any of the 8 resize handles of rect r, else null.
 */
export function hitTestHandle(p, r, radius = HANDLE_HIT_RADIUS) {
    const handles = rectHandlePoints(r);
    const rSq = radius * radius;
    for (let i = 0; i < handles.length; i++) {
        if (distanceSq(p, handles[i]) <= rSq) {
            return i;
        }
    }
    return null;
}
/**
 * Test whether point p hits annotation a.
 * @param p       Point in document coordinates
 * @param a       Annotation to test
 * @param tol     Tolerance in document units (expand hit area by this amount)
 */
export function hitTestAnnotation(p, a, tol = DEFAULT_HIT_TOLERANCE) {
    const { geometry, style, type } = a;
    // ── AABB quick reject ──────────────────────────────────────────────────
    const aabb = getAnnotationBounds(a);
    if (aabb && !rectContainsPoint(rectInflate(aabb, tol), p)) {
        return false;
    }
    // ── Precise hit test ───────────────────────────────────────────────────
    switch (geometry.kind) {
        case 'rect': {
            const r = rectInflate(geometry.rect, tol);
            if (type === 'ellipse') {
                // For ellipse: hit if near the perimeter OR inside a filled ellipse
                if (style.fillColor !== 'transparent' && style.fillColor !== 'none') {
                    return pointInEllipse(p, geometry.rect);
                }
                const tolSq = tol * tol;
                return pointToEllipseEdgeDistanceSq(p, geometry.rect) <= tolSq;
            }
            // Rect, highlight, text: filled → full interior; no fill → edges only
            if (type === 'highlight' || type === 'text') {
                return rectContainsPoint(r, p);
            }
            if (style.fillColor === 'transparent' || style.fillColor === 'none') {
                return hitTestRectEdge(p, geometry.rect, tol);
            }
            return rectContainsPoint(r, p);
        }
        case 'path': {
            // Hit if close to any segment
            const tolSq = (tol + style.strokeWidth / 2) * (tol + style.strokeWidth / 2);
            const pts = geometry.points;
            for (let i = 0; i < pts.length - 1; i++) {
                if (pointToSegmentDistanceSq(p, pts[i], pts[i + 1]) <= tolSq) {
                    return true;
                }
            }
            if (geometry.closed && pts.length > 1) {
                if (pointToSegmentDistanceSq(p, pts[pts.length - 1], pts[0]) <= tolSq) {
                    return true;
                }
            }
            return false;
        }
        case 'point': {
            const tolSq = (tol + 12) * (tol + 12); // sticky note icon is ~12px
            return distanceSq(p, geometry.point) <= tolSq;
        }
        case 'line': {
            const tolSq = (tol + style.strokeWidth / 2) * (tol + style.strokeWidth / 2);
            return pointToSegmentDistanceSq(p, geometry.startPoint, geometry.endPoint) <= tolSq;
        }
    }
}
/** Test if point is near the edge (not interior) of a rect */
function hitTestRectEdge(p, r, tol) {
    const onLeft = Math.abs(p.x - r.x) <= tol && p.y >= r.y - tol && p.y <= r.y + r.height + tol;
    const onRight = Math.abs(p.x - (r.x + r.width)) <= tol && p.y >= r.y - tol && p.y <= r.y + r.height + tol;
    const onTop = Math.abs(p.y - r.y) <= tol && p.x >= r.x - tol && p.x <= r.x + r.width + tol;
    const onBottom = Math.abs(p.y - (r.y + r.height)) <= tol && p.x >= r.x - tol && p.x <= r.x + r.width + tol;
    return onLeft || onRight || onTop || onBottom;
}
/** Get the bounding rect of any annotation for quick-reject */
export function getAnnotationBounds(a) {
    const { geometry } = a;
    switch (geometry.kind) {
        case 'rect': return geometry.rect;
        case 'path': return geometry.bounds;
        case 'line': {
            const { startPoint: s, endPoint: e } = geometry;
            const x = Math.min(s.x, e.x);
            const y = Math.min(s.y, e.y);
            return { x, y, width: Math.abs(e.x - s.x), height: Math.abs(e.y - s.y) };
        }
        case 'point': {
            const { x, y } = geometry.point;
            return { x: x - 20, y: y - 20, width: 40, height: 40 };
        }
    }
}
/**
 * Hit-test all annotations and return those that p falls within,
 * sorted so the topmost (last-drawn) annotation comes first.
 */
export function hitTestAll(p, annotations, tol = DEFAULT_HIT_TOLERANCE) {
    const hits = [];
    // Iterate in reverse so topmost (rendered last) is found first
    for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        if (!a.isLocked && hitTestAnnotation(p, a, tol)) {
            hits.push(a);
        }
    }
    return hits;
}
/**
 * Returns true if the selection lasso rect intersects the annotation.
 */
export function hitTestLasso(lasso, a) {
    const bounds = getAnnotationBounds(a);
    if (!bounds)
        return false;
    // Use inflated lasso for lenient selection
    const inflated = rectInflate(lasso, 1);
    return (inflated.x < bounds.x + bounds.width &&
        inflated.x + inflated.width > bounds.x &&
        inflated.y < bounds.y + bounds.height &&
        inflated.y + inflated.height > bounds.y);
}
/**
 * Compute a unified bounding rect for a set of annotations.
 */
export function selectionBounds(annotations) {
    if (annotations.length === 0)
        return null;
    const bounds = annotations.map(getAnnotationBounds).filter((b) => b !== null);
    if (bounds.length === 0)
        return null;
    let minX = bounds[0].x, minY = bounds[0].y;
    let maxX = bounds[0].x + bounds[0].width, maxY = bounds[0].y + bounds[0].height;
    for (const b of bounds) {
        if (b.x < minX)
            minX = b.x;
        if (b.y < minY)
            minY = b.y;
        if (b.x + b.width > maxX)
            maxX = b.x + b.width;
        if (b.y + b.height > maxY)
            maxY = b.y + b.height;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
//# sourceMappingURL=hit-test.js.map