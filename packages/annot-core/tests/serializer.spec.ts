/**
 * @file serializer.spec.ts
 * Unit tests for annotation import/export serialisation.
 */

import { exportToJson, importFromJson } from '../src/serialization/serializer';
import type { Annotation } from '../src/model/annotation.model';
import { CURRENT_SCHEMA_VERSION } from '../src/model/annotation.model';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'test-id-001',
    docId: 'doc-1',
    pageIndex: 0,
    type: 'rectangle',
    author: 'Test User',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isLocked: false,
    style: {
      strokeColor: '#FF0000',
      fillColor: 'rgba(255,0,0,0.2)',
      opacity: 1,
      strokeWidth: 2,
    },
    geometry: {
      kind: 'rect',
      rect: { x: 10, y: 20, width: 100, height: 50 },
    },
    meta: { text: 'Test annotation', tags: ['important'], status: 'open' },
    ...overrides,
  };
}

describe('exportToJson', () => {
  test('produces valid JSON string', () => {
    const json = exportToJson('doc-1', [makeAnnotation()]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('includes schemaVersion, docId, exportedAt, annotations', () => {
    const json = exportToJson('doc-1', [makeAnnotation()]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('schemaVersion', CURRENT_SCHEMA_VERSION);
    expect(parsed).toHaveProperty('docId', 'doc-1');
    expect(parsed).toHaveProperty('exportedAt');
    expect(Array.isArray(parsed.annotations)).toBe(true);
    expect(parsed.annotations).toHaveLength(1);
  });

  test('round-trips annotation data faithfully', () => {
    const a = makeAnnotation();
    const json = exportToJson('doc-1', [a]);
    const parsed = JSON.parse(json);
    expect(parsed.annotations[0].id).toBe(a.id);
    expect(parsed.annotations[0].geometry).toEqual(a.geometry);
    expect(parsed.annotations[0].style).toEqual(a.style);
    expect(parsed.annotations[0].meta).toEqual(a.meta);
  });

  test('exports empty annotation list', () => {
    const json = exportToJson('doc-1', []);
    const parsed = JSON.parse(json);
    expect(parsed.annotations).toHaveLength(0);
  });
});

describe('importFromJson', () => {
  test('round-trips through export → import', () => {
    const original = [makeAnnotation(), makeAnnotation({ id: 'test-id-002', type: 'highlight' })];
    const json = exportToJson('doc-1', original);
    const { document, warnings } = importFromJson(json);
    expect(document.annotations).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });

  test('throws on invalid JSON', () => {
    expect(() => importFromJson('not json {')).toThrow(/Failed to parse/);
  });

  test('throws on non-object root', () => {
    expect(() => importFromJson('[1,2,3]')).toThrow();
  });

  test('throws on missing required fields', () => {
    const invalid = JSON.stringify({ schemaVersion: 1, docId: 'x' }); // missing annotations
    expect(() => importFromJson(invalid)).toThrow();
  });

  test('throws when document version is newer than library', () => {
    const futureDoc = JSON.stringify({
      schemaVersion: 9999,
      docId: 'x',
      exportedAt: new Date().toISOString(),
      annotations: [],
    });
    expect(() => importFromJson(futureDoc)).toThrow(/newer/);
  });

  test('preserves all annotation types', () => {
    const types: Annotation['type'][] = ['highlight', 'freehand', 'text', 'comment', 'rectangle', 'ellipse', 'arrow', 'line'];
    const annotations = types.map((type, i) => {
      const base = makeAnnotation({ id: `id-${i}`, type });
      if (type === 'freehand') {
        return { ...base, geometry: { kind: 'path' as const, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], closed: false, bounds: { x: 0, y: 0, width: 10, height: 10 } } };
      }
      if (type === 'comment') {
        return { ...base, geometry: { kind: 'point' as const, point: { x: 5, y: 5 } } };
      }
      if (type === 'arrow' || type === 'line') {
        return { ...base, geometry: { kind: 'line' as const, startPoint: { x: 0, y: 0 }, endPoint: { x: 10, y: 10 }, hasArrowHead: type === 'arrow', hasArrowTail: false } };
      }
      return base;
    });
    const json = exportToJson('doc-1', annotations);
    const { document } = importFromJson(json);
    expect(document.annotations).toHaveLength(types.length);
    for (let i = 0; i < types.length; i++) {
      expect(document.annotations[i].type).toBe(types[i]);
    }
  });
});

describe('Schema validation', () => {
  test('rejects annotation with invalid type', () => {
    const badAnnot = makeAnnotation({ type: 'invalid-type' as Annotation['type'] });
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      docId: 'doc-1',
      exportedAt: new Date().toISOString(),
      annotations: [badAnnot],
    });
    expect(() => importFromJson(json)).toThrow();
  });

  test('rejects annotation with opacity out of range', () => {
    const badAnnot = makeAnnotation({ style: { ...makeAnnotation().style, opacity: 5 } });
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      docId: 'doc-1',
      exportedAt: new Date().toISOString(),
      annotations: [badAnnot],
    });
    expect(() => importFromJson(json)).toThrow();
  });
});
