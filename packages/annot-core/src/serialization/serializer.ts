/**
 * @file serializer.ts
 * Import/export for annotation data.
 *
 * Supports:
 *  - JSON (native, lossless)
 *
 * Phase 2 (server-side): embedding annotations into PDF bytes using
 * a server endpoint that handles PDF byte-level manipulation.
 * This is deliberately out-of-scope for the browser library because:
 *  1. Editing PDF binary structures requires parsing the full PDF spec.
 *  2. No compliant PDF library exists without significant native code.
 *  3. Server-side rendering is far safer for compliance/archival.
 */

import type { Annotation, AnnotationDocument } from '../model/annotation.model.js';
import { CURRENT_SCHEMA_VERSION } from '../model/annotation.model.js';
import { assertAnnotationDocument } from '../model/schema.js';
import { migrate } from '../model/migrations.js';

// ─── Export ──────────────────────────────────────────────────────────────────

/** Serialise annotations to a JSON string */
export function exportToJson(
  docId: string,
  annotations: ReadonlyArray<Annotation>,
  indent = 2
): string {
  const doc: AnnotationDocument = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    docId,
    exportedAt: new Date().toISOString(),
    annotations,
  };
  return JSON.stringify(doc, null, indent);
}

/** Trigger a browser file download of the annotation JSON */
export function downloadJson(
  docId: string,
  annotations: ReadonlyArray<Annotation>,
  filename?: string
): void {
  const json = exportToJson(docId, annotations);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `annotations-${docId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so the download can start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface ImportResult {
  readonly document: AnnotationDocument;
  readonly migrationsApplied: ReadonlyArray<number>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Parse and validate a JSON string previously exported by this library.
 * Automatically applies schema migrations if needed.
 * Throws on parse error or validation failure.
 */
export function importFromJson(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`Failed to parse annotation JSON: ${(e as Error).message}`);
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid annotation file: expected a JSON object at root');
  }

  const warnings: string[] = [];

  // Migrate if needed
  const { document, migrationsApplied } = migrate(raw as Record<string, unknown>);
  if (migrationsApplied.length > 0) {
    warnings.push(`Document migrated from v${migrationsApplied[0]} to v${CURRENT_SCHEMA_VERSION}`);
  }

  // Validate
  const validated = assertAnnotationDocument(document);

  return { document: validated, migrationsApplied, warnings };
}

/**
 * Open a file-picker dialog and import the selected JSON file.
 * Returns a Promise that resolves with the ImportResult.
 */
export function importFromFile(): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      try {
        const text = await file.text();
        resolve(importFromJson(text));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

/** Copy selected annotations to the system clipboard as JSON */
export async function copyToClipboard(annotations: ReadonlyArray<Annotation>): Promise<void> {
  const json = JSON.stringify({ annotations }, null, 2);
  await navigator.clipboard.writeText(json);
}

/** Paste annotations from the system clipboard (offsets position to avoid overlap) */
export async function pasteFromClipboard(
  docId: string,
  pageIndex: number,
  offset = { x: 10, y: 10 }
): Promise<Annotation[]> {
  const text = await navigator.clipboard.readText();
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return []; }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Record<string, unknown>)['annotations'])) {
    return [];
  }
  const pasted = ((raw as Record<string, unknown>)['annotations'] as Annotation[]).map(a => ({
    ...a,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    docId,
    pageIndex,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    geometry: offsetGeometry(a.geometry, offset.x, offset.y),
  }));
  return pasted;
}

function offsetGeometry(
  g: Annotation['geometry'],
  dx: number,
  dy: number
): Annotation['geometry'] {
  switch (g.kind) {
    case 'rect': return { kind: 'rect', rect: { ...g.rect, x: g.rect.x + dx, y: g.rect.y + dy } };
    case 'path': return {
      kind: 'path',
      points: g.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
      closed: g.closed,
      bounds: { ...g.bounds, x: g.bounds.x + dx, y: g.bounds.y + dy },
    };
    case 'point': return { kind: 'point', point: { x: g.point.x + dx, y: g.point.y + dy } };
    case 'line': return {
      kind: 'line',
      startPoint: { x: g.startPoint.x + dx, y: g.startPoint.y + dy },
      endPoint: { x: g.endPoint.x + dx, y: g.endPoint.y + dy },
      hasArrowHead: g.hasArrowHead,
      hasArrowTail: g.hasArrowTail,
    };
  }
}
