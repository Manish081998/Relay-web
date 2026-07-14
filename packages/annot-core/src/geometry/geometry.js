/**
 * @file geometry.ts
 * Pure geometry utilities – zero side-effects, fully tree-shakeable.
 * All functions operate in document coordinates unless stated otherwise.
 */
// ─── Point operations ────────────────────────────────────────────────────────
export function pt(x, y) {
    return { x, y };
}
export function addPt(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
export function subPt(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
export function scalePt(p, s) {
    return { x: p.x * s, y: p.y * s };
}
export function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}
export function distance(a, b) {
    return Math.sqrt(distanceSq(a, b));
}
export function midPoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
export function clampPt(p, bounds) {
    return {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, p.x)),
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, p.y)),
    };
}
/** Normalise a point angle to degrees 0..360 */
export function pointAngleDeg(from, to) {
    const rad = Math.atan2(to.y - from.y, to.x - from.x);
    return ((rad * 180) / Math.PI + 360) % 360;
}
// ─── Rect operations ─────────────────────────────────────────────────────────
/** Create a Rect ensuring positive width/height regardless of point order */
export function rectFromPoints(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
        x,
        y,
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
    };
}
export function rectCenter(r) {
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
export function rectContainsPoint(r, p) {
    return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}
export function rectsIntersect(a, b) {
    return (a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y);
}
export function rectUnion(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const right = Math.max(a.x + a.width, b.x + b.width);
    const bottom = Math.max(a.y + a.height, b.y + b.height);
    return { x, y, width: right - x, height: bottom - y };
}
export function rectInflate(r, amount) {
    return {
        x: r.x - amount,
        y: r.y - amount,
        width: r.width + 2 * amount,
        height: r.height + 2 * amount,
    };
}
export function rectTranslate(r, dx, dy) {
    return { ...r, x: r.x + dx, y: r.y + dy };
}
/**
 * Handle layout (clockwise from TL):
 *  0=TL, 1=TC, 2=TR, 3=MR, 4=BR, 5=BC, 6=BL, 7=ML
 */
export function rectResizeByHandle(original, handle, delta) {
    let { x, y, width, height } = original;
    const { x: dx, y: dy } = delta;
    switch (handle) {
        case 0:
            x += dx;
            y += dy;
            width -= dx;
            height -= dy;
            break; // TL
        case 1:
            y += dy;
            height -= dy;
            break; // TC
        case 2:
            y += dy;
            width += dx;
            height -= dy;
            break; // TR
        case 3:
            width += dx;
            break; // MR
        case 4:
            width += dx;
            height += dy;
            break; // BR
        case 5:
            height += dy;
            break; // BC
        case 6:
            x += dx;
            width -= dx;
            height += dy;
            break; // BL
        case 7:
            x += dx;
            width -= dx;
            break; // ML
    }
    // Prevent negative size
    if (width < 4) {
        width = 4;
    }
    if (height < 4) {
        height = 4;
    }
    return { x, y, width, height };
}
/** The 8 handle positions for a given rect (in same coord space) */
export function rectHandlePoints(r) {
    const { x, y, width: w, height: h } = r;
    const cx = x + w / 2;
    const cy = y + h / 2;
    return [
        { x, y }, // 0 TL
        { x: cx, y }, // 1 TC
        { x: x + w, y }, // 2 TR
        { x: x + w, y: cy }, // 3 MR
        { x: x + w, y: y + h }, // 4 BR
        { x: cx, y: y + h }, // 5 BC
        { x, y: y + h }, // 6 BL
        { x, y: cy }, // 7 ML
    ];
}
// ─── Path / polyline helpers ─────────────────────────────────────────────────
/** Compute bounding rect for an array of points */
export function pointsBounds(points) {
    if (points.length === 0)
        return { x: 0, y: 0, width: 0, height: 0 };
    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;
    for (let i = 1; i < points.length; i++) {
        const { x, y } = points[i];
        if (x < minX)
            minX = x;
        if (x > maxX)
            maxX = x;
        if (y < minY)
            minY = y;
        if (y > maxY)
            maxY = y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
/**
 * Minimum distance (squared) from point p to segment [a, b].
 * Cheaper than computing square root – use only for threshold comparisons.
 */
export function pointToSegmentDistanceSq(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0)
        return distanceSq(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return distanceSq(p, { x: a.x + t * dx, y: a.y + t * dy });
}
/** Douglas–Peucker polyline simplification */
export function simplifyPath(points, tolerance) {
    if (points.length <= 2)
        return [...points];
    const tolSq = tolerance * tolerance;
    const result = [];
    simplifySegment(points, 0, points.length - 1, tolSq, result);
    result.push(points[points.length - 1]);
    return result;
}
function simplifySegment(points, start, end, tolSq, result) {
    let maxDistSq = 0;
    let maxIdx = 0;
    for (let i = start + 1; i < end; i++) {
        const dSq = pointToSegmentDistanceSq(points[i], points[start], points[end]);
        if (dSq > maxDistSq) {
            maxDistSq = dSq;
            maxIdx = i;
        }
    }
    if (maxDistSq > tolSq) {
        simplifySegment(points, start, maxIdx, tolSq, result);
        result.push(points[maxIdx]);
        simplifySegment(points, maxIdx, end, tolSq, result);
    }
    else {
        result.push(points[start]);
    }
}
// ─── Ellipse helpers ─────────────────────────────────────────────────────────
/**
 * Is point p inside the ellipse inscribed in rect r?
 * Uses normalised ellipse equation: ((x-cx)/rx)² + ((y-cy)/ry)² <= 1
 */
export function pointInEllipse(p, r) {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const rx = r.width / 2;
    const ry = r.height / 2;
    if (rx === 0 || ry === 0)
        return false;
    const nx = (p.x - cx) / rx;
    const ny = (p.y - cy) / ry;
    return nx * nx + ny * ny <= 1;
}
/**
 * Minimum distance from point p to the ellipse perimeter (approximate).
 * Uses parameterised sampling – fast enough for hit-testing.
 */
export function pointToEllipseEdgeDistanceSq(p, r, samples = 64) {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const rx = r.width / 2;
    const ry = r.height / 2;
    let minDSq = Infinity;
    for (let i = 0; i < samples; i++) {
        const theta = (i / samples) * 2 * Math.PI;
        const ex = cx + rx * Math.cos(theta);
        const ey = cy + ry * Math.sin(theta);
        const dSq = distanceSq(p, { x: ex, y: ey });
        if (dSq < minDSq)
            minDSq = dSq;
    }
    return minDSq;
}
/** Compute the three points of an arrowhead triangle */
export function arrowHead(from, to, headLength = 14, halfAngle = Math.PI / 6) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    return {
        tip: to,
        left: {
            x: to.x - headLength * Math.cos(angle - halfAngle),
            y: to.y - headLength * Math.sin(angle - halfAngle),
        },
        right: {
            x: to.x - headLength * Math.cos(angle + halfAngle),
            y: to.y - headLength * Math.sin(angle + halfAngle),
        },
    };
}
//# sourceMappingURL=geometry.js.map