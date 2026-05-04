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
export interface MigrationResult {
    readonly document: AnnotationDocument;
    /** Versions applied in order */
    readonly migrationsApplied: ReadonlyArray<number>;
}
/**
 * Migrate a raw parsed JSON object to the current schema version.
 * Throws if the document version is newer than the library's version.
 */
export declare function migrate(raw: Record<string, unknown>): MigrationResult;
/**
 * Returns true if the given raw document requires migration.
 */
export declare function needsMigration(raw: Record<string, unknown>): boolean;
//# sourceMappingURL=migrations.d.ts.map