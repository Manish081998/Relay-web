/**
 * @file geometry.spec.ts
 * Unit tests for the geometry utility functions.
 */

import {
  pt, addPt, subPt, scalePt, distance, distanceSq, midPoint,
  rectFromPoints, rectCenter, rectContainsPoint, rectsIntersect,
  rectUnion, rectInflate, rectTranslate, rectHandlePoints, rectResizeByHandle,
  pointsBounds, pointToSegmentDistanceSq, simplifyPath,
  pointInEllipse, arrowHead,
} from '../src/geometry/geometry';

describe('Point operations', () => {
  test('pt() constructs a point', () => {
    expect(pt(3, 4)).toEqual({ x: 3, y: 4 });
  });

  test('addPt', () => {
    expect(addPt(pt(1, 2), pt(3, 4))).toEqual({ x: 4, y: 6 });
  });

  test('subPt', () => {
    expect(subPt(pt(5, 7), pt(2, 3))).toEqual({ x: 3, y: 4 });
  });

  test('scalePt', () => {
    expect(scalePt(pt(2, 3), 2)).toEqual({ x: 4, y: 6 });
  });

  test('distance', () => {
    expect(distance(pt(0, 0), pt(3, 4))).toBeCloseTo(5);
  });

  test('distanceSq', () => {
    expect(distanceSq(pt(0, 0), pt(3, 4))).toBe(25);
  });

  test('midPoint', () => {
    expect(midPoint(pt(0, 0), pt(10, 10))).toEqual({ x: 5, y: 5 });
  });
});

describe('Rect operations', () => {
  test('rectFromPoints – handles reversed corners', () => {
    const r = rectFromPoints(pt(10, 10), pt(0, 0));
    expect(r).toEqual({ x: 0, y: 0, width: 10, height: 10 });
  });

  test('rectCenter', () => {
    expect(rectCenter({ x: 0, y: 0, width: 100, height: 50 })).toEqual({ x: 50, y: 25 });
  });

  test('rectContainsPoint – inside', () => {
    expect(rectContainsPoint({ x: 0, y: 0, width: 100, height: 100 }, pt(50, 50))).toBe(true);
  });

  test('rectContainsPoint – outside', () => {
    expect(rectContainsPoint({ x: 0, y: 0, width: 100, height: 100 }, pt(150, 50))).toBe(false);
  });

  test('rectContainsPoint – on boundary', () => {
    expect(rectContainsPoint({ x: 0, y: 0, width: 100, height: 100 }, pt(100, 100))).toBe(true);
  });

  test('rectsIntersect – overlapping', () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 25, y: 25, width: 50, height: 50 }
    )).toBe(true);
  });

  test('rectsIntersect – non-overlapping', () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 60, y: 60, width: 50, height: 50 }
    )).toBe(false);
  });

  test('rectUnion', () => {
    const u = rectUnion(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 30, y: 30, width: 50, height: 50 }
    );
    expect(u).toEqual({ x: 0, y: 0, width: 80, height: 80 });
  });

  test('rectInflate', () => {
    const r = rectInflate({ x: 10, y: 10, width: 20, height: 20 }, 5);
    expect(r).toEqual({ x: 5, y: 5, width: 30, height: 30 });
  });

  test('rectTranslate', () => {
    const r = rectTranslate({ x: 10, y: 10, width: 20, height: 20 }, 5, -3);
    expect(r).toEqual({ x: 15, y: 7, width: 20, height: 20 });
  });

  test('rectHandlePoints returns 8 points', () => {
    const handles = rectHandlePoints({ x: 0, y: 0, width: 100, height: 50 });
    expect(handles).toHaveLength(8);
    // TL
    expect(handles[0]).toEqual({ x: 0, y: 0 });
    // BR
    expect(handles[4]).toEqual({ x: 100, y: 50 });
  });

  test('rectResizeByHandle – handle 4 (BR) grows rect', () => {
    const r = rectResizeByHandle({ x: 0, y: 0, width: 100, height: 100 }, 4, pt(10, 10));
    expect(r).toEqual({ x: 0, y: 0, width: 110, height: 110 });
  });

  test('rectResizeByHandle – handle 0 (TL) moves origin', () => {
    const r = rectResizeByHandle({ x: 0, y: 0, width: 100, height: 100 }, 0, pt(10, 10));
    expect(r).toEqual({ x: 10, y: 10, width: 90, height: 90 });
  });

  test('rectResizeByHandle prevents negative size', () => {
    const r = rectResizeByHandle({ x: 0, y: 0, width: 10, height: 10 }, 4, pt(-20, -20));
    expect(r.width).toBeGreaterThanOrEqual(4);
    expect(r.height).toBeGreaterThanOrEqual(4);
  });
});

describe('Path / polyline helpers', () => {
  test('pointsBounds', () => {
    const pts = [pt(5, 2), pt(1, 8), pt(9, 3)];
    expect(pointsBounds(pts)).toEqual({ x: 1, y: 2, width: 8, height: 6 });
  });

  test('pointsBounds – single point', () => {
    expect(pointsBounds([pt(3, 4)])).toEqual({ x: 3, y: 4, width: 0, height: 0 });
  });

  test('pointToSegmentDistanceSq – point on segment', () => {
    const d = pointToSegmentDistanceSq(pt(5, 0), pt(0, 0), pt(10, 0));
    expect(d).toBeCloseTo(0);
  });

  test('pointToSegmentDistanceSq – point off segment', () => {
    const d = pointToSegmentDistanceSq(pt(5, 3), pt(0, 0), pt(10, 0));
    expect(d).toBeCloseTo(9); // 3² = 9
  });

  test('simplifyPath – collinear points are removed', () => {
    const pts = [pt(0, 0), pt(1, 0), pt(2, 0), pt(3, 0), pt(4, 0)];
    const result = simplifyPath(pts, 0.5);
    // With collinear points and tolerance > 0, only endpoints should remain
    expect(result.length).toBeLessThan(pts.length);
    expect(result[0]).toEqual(pt(0, 0));
    expect(result[result.length - 1]).toEqual(pt(4, 0));
  });
});

describe('Ellipse helpers', () => {
  const ellipse = { x: 0, y: 0, width: 100, height: 60 };

  test('pointInEllipse – centre is inside', () => {
    expect(pointInEllipse(pt(50, 30), ellipse)).toBe(true);
  });

  test('pointInEllipse – far outside', () => {
    expect(pointInEllipse(pt(200, 200), ellipse)).toBe(false);
  });

  test('pointInEllipse – on boundary (approx)', () => {
    // Right edge of ellipse: x=100, y=30
    expect(pointInEllipse(pt(100, 30), ellipse)).toBe(true);
  });
});

describe('Arrow helpers', () => {
  test('arrowHead returns 3 points', () => {
    const head = arrowHead(pt(0, 0), pt(100, 0));
    expect(head.tip).toEqual({ x: 100, y: 0 });
    // left and right should be behind the tip
    expect(head.left.x).toBeLessThan(100);
    expect(head.right.x).toBeLessThan(100);
  });
});
