/**
 * @file hit-test.spec.ts
 * Unit tests for the hit-testing engine.
 */

import { hitTestAnnotation, hitTestAll, hitTestLasso, selectionBounds, getAnnotationBounds } from '../src/geometry/hit-test';
import type { Annotation } from '../src/model/annotation.model';
import { CURRENT_SCHEMA_VERSION } from '../src/model/annotation.model';

const BASE_STYLE: Annotation['style'] = {
  strokeColor: '#000',
  fillColor: 'rgba(0,0,0,0.2)',
  opacity: 1,
  strokeWidth: 2,
};

function makeAnnotation(partial: Partial<Annotation>): Annotation {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'test',
    docId: 'doc',
    pageIndex: 0,
    type: 'rectangle',
    author: 'test',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isLocked: false,
    style: BASE_STYLE,
    geometry: { kind: 'rect', rect: { x: 0, y: 0, width: 100, height: 100 } },
    meta: {},
    ...partial,
  };
}

// ─── Rectangle ────────────────────────────────────────────────────────────────

describe('hitTestAnnotation – rectangle', () => {
  const rect = makeAnnotation({ type: 'rectangle' });

  test('hit inside', () => {
    expect(hitTestAnnotation({ x: 50, y: 50 }, rect, 0)).toBe(true);
  });

  test('miss outside', () => {
    expect(hitTestAnnotation({ x: 200, y: 200 }, rect, 0)).toBe(false);
  });

  test('hit within tolerance of edge', () => {
    expect(hitTestAnnotation({ x: -4, y: 50 }, rect, 5)).toBe(true);
  });

  test('miss just beyond tolerance', () => {
    expect(hitTestAnnotation({ x: -10, y: 50 }, rect, 5)).toBe(false);
  });
});

// ─── Ellipse ──────────────────────────────────────────────────────────────────

describe('hitTestAnnotation – ellipse', () => {
  const ellipse = makeAnnotation({
    type: 'ellipse',
    style: { ...BASE_STYLE, fillColor: 'transparent' },
    geometry: { kind: 'rect', rect: { x: 0, y: 0, width: 100, height: 60 } },
  });

  test('hit near perimeter (right edge)', () => {
    // Right edge at x=100, y=30 — with tolerance
    expect(hitTestAnnotation({ x: 98, y: 30 }, ellipse, 5)).toBe(true);
  });

  test('miss far outside', () => {
    expect(hitTestAnnotation({ x: 200, y: 200 }, ellipse, 0)).toBe(false);
  });
});

// ─── Freehand path ────────────────────────────────────────────────────────────

describe('hitTestAnnotation – freehand path', () => {
  const path = makeAnnotation({
    type: 'freehand',
    geometry: {
      kind: 'path',
      points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 50 }],
      closed: false,
      bounds: { x: 0, y: 0, width: 100, height: 50 },
    },
  });

  test('hit on segment', () => {
    // Point directly on the first segment (y=0, x=25)
    expect(hitTestAnnotation({ x: 25, y: 0 }, path, 3)).toBe(true);
  });

  test('miss far from path', () => {
    expect(hitTestAnnotation({ x: 25, y: 50 }, path, 3)).toBe(false);
  });
});

// ─── Comment (point) ──────────────────────────────────────────────────────────

describe('hitTestAnnotation – comment point', () => {
  const comment = makeAnnotation({
    type: 'comment',
    geometry: { kind: 'point', point: { x: 50, y: 50 } },
  });

  test('hit near point', () => {
    expect(hitTestAnnotation({ x: 55, y: 55 }, comment, 10)).toBe(true);
  });

  test('miss far from point', () => {
    expect(hitTestAnnotation({ x: 200, y: 200 }, comment, 10)).toBe(false);
  });
});

// ─── Line / Arrow ─────────────────────────────────────────────────────────────

describe('hitTestAnnotation – line', () => {
  const line = makeAnnotation({
    type: 'line',
    geometry: { kind: 'line', startPoint: { x: 0, y: 0 }, endPoint: { x: 100, y: 0 }, hasArrowHead: false, hasArrowTail: false },
  });

  test('hit on line', () => {
    expect(hitTestAnnotation({ x: 50, y: 0 }, line, 5)).toBe(true);
  });

  test('hit within tolerance', () => {
    expect(hitTestAnnotation({ x: 50, y: 4 }, line, 5)).toBe(true);
  });

  test('miss beyond tolerance', () => {
    expect(hitTestAnnotation({ x: 50, y: 20 }, line, 5)).toBe(false);
  });
});

// ─── hitTestAll ───────────────────────────────────────────────────────────────

describe('hitTestAll', () => {
  const annotations: Annotation[] = [
    makeAnnotation({ id: 'a', type: 'rectangle' }),
    makeAnnotation({ id: 'b', type: 'rectangle', geometry: { kind: 'rect', rect: { x: 80, y: 80, width: 100, height: 100 } } }),
  ];

  test('returns top annotation first (reversed order)', () => {
    // Both rects cover (90, 90)
    const hits = hitTestAll({ x: 90, y: 90 }, annotations, 0);
    expect(hits.length).toBeGreaterThan(0);
    // Last in array = top = first in hits
    expect(hits[0].id).toBe('b');
  });

  test('returns empty array when no hits', () => {
    expect(hitTestAll({ x: 500, y: 500 }, annotations, 0)).toHaveLength(0);
  });

  test('skips locked annotations', () => {
    const locked: Annotation[] = [makeAnnotation({ id: 'locked', isLocked: true })];
    expect(hitTestAll({ x: 50, y: 50 }, locked, 0)).toHaveLength(0);
  });
});

// ─── hitTestLasso ────────────────────────────────────────────────────────────

describe('hitTestLasso', () => {
  const rect = makeAnnotation({ type: 'rectangle' });
  const lasso = { x: 40, y: 40, width: 80, height: 80 };

  test('overlapping rects hit', () => {
    expect(hitTestLasso(lasso, rect)).toBe(true);
  });

  test('non-overlapping rects miss', () => {
    const far = makeAnnotation({ geometry: { kind: 'rect', rect: { x: 200, y: 200, width: 50, height: 50 } } });
    expect(hitTestLasso(lasso, far)).toBe(false);
  });
});

// ─── selectionBounds ──────────────────────────────────────────────────────────

describe('selectionBounds', () => {
  test('returns null for empty array', () => {
    expect(selectionBounds([])).toBeNull();
  });

  test('returns single annotation bounds', () => {
    const a = makeAnnotation({ geometry: { kind: 'rect', rect: { x: 10, y: 20, width: 30, height: 40 } } });
    expect(selectionBounds([a])).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  test('unions multiple annotations', () => {
    const a = makeAnnotation({ id: 'a', geometry: { kind: 'rect', rect: { x: 0, y: 0, width: 50, height: 50 } } });
    const b = makeAnnotation({ id: 'b', geometry: { kind: 'rect', rect: { x: 40, y: 40, width: 50, height: 50 } } });
    const bounds = selectionBounds([a, b]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 90, height: 90 });
  });
});
