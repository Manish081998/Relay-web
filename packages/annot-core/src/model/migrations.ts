/**
 * @file migrations.ts
 * Schema versioning and migration strategy.
 *
 * STRATEGY
 * Each schema version bump adds a MigrationFn that transforms a document
 * from version N to version N+1.  The migrate() entry point chains all
 * required migrations automatically.
 *
 * When adding a breaking change:
 *  1. Increment CURRENT_SCHEMA_VERSION in annotation.model.ts
 *  2. Add a MigrationFn below that fixes up the raw JSON object
 *  3. Add it to the MIGRATIONS map with the *source* version as key
 *
 * Migrations must be pure functions operating on plain objects (no
 * class instances) so they can run before validation.
 */

import type { AnnotationDocument } from './annotation.model.js';
import { CURRENT_SCHEMA_VERSION } from './annotation.model.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A migration transforms a raw (possibly invalid-by-new-schema) document object */
type MigrationFn = (doc: Record<string, unknown>) => Record<string, unknown>;

// ─── Migration registry ──────────────────────────────────────────────────────

/**
 * Map from source schema version → migration that produces source+1.
 * Currently only version 1 exists so no migrations are needed yet;
 * this file demonstrates the pattern for future maintainers.
 */
const MIGRATIONS: Readonly<Map<number, MigrationFn>> = new Map([
  // Example – uncomment when v2 is introduced:
  // [1, migrateV1ToV2],
]);

// ─── Example future migration (kept for illustration) ────────────────────────

/*
function migrateV1ToV2(doc: Record<string, unknown>): Record<string, unknown> {
  // Suppose v2 renames 'meta.text' → 'meta.content'
  const annotations = (doc['annotations'] as Array<Record<string, unknown>>) ?? [];
  return {
    ...doc,
    schemaVersion: 2,
    annotations: annotations.map(a => {
      const meta = (a['meta'] as Record<string, unknown>) ?? {};
      const { text, ...restMeta } = meta;
      return {
        ...a,
        schemaVersion: 2,
        meta: { ...restMeta, content: text },
      };
    }),
  };
}
*/

// ─── Public API ──────────────────────────────────────────────────────────────

export interface MigrationResult {
  readonly document: AnnotationDocument;
  /** Versions applied in order */
  readonly migrationsApplied: ReadonlyArray<number>;
}

/**
 * Migrate a raw parsed JSON object to the current schema version.
 * Throws if the document version is newer than the library's version.
 */
export function migrate(raw: Record<string, unknown>): MigrationResult {
  const sourceVersion = typeof raw['schemaVersion'] === 'number'
    ? raw['schemaVersion']
    : 0;

  if (sourceVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Cannot migrate: document schemaVersion ${sourceVersion} is newer ` +
      `than library schemaVersion ${CURRENT_SCHEMA_VERSION}. ` +
      `Please upgrade the annotation library.`
    );
  }

  if (sourceVersion === CURRENT_SCHEMA_VERSION) {
    return {
      document: raw as unknown as AnnotationDocument,
      migrationsApplied: [],
    };
  }

  const migrationsApplied: number[] = [];
  let current: Record<string, unknown> = { ...raw };

  for (let v = sourceVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const fn = MIGRATIONS.get(v);
    if (!fn) {
      throw new Error(
        `No migration registered from schema version ${v} to ${v + 1}. ` +
        `The document cannot be upgraded.`
      );
    }
    current = fn(current);
    migrationsApplied.push(v);
  }

  return {
    document: current as unknown as AnnotationDocument,
    migrationsApplied,
  };
}

/**
 * Returns true if the given raw document requires migration.
 */
export function needsMigration(raw: Record<string, unknown>): boolean {
  const v = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
  return v < CURRENT_SCHEMA_VERSION;
}
