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
import { CURRENT_SCHEMA_VERSION } from './annotation.model.js';
// ─── Migration registry ──────────────────────────────────────────────────────
/**
 * Map from source schema version → migration that produces source+1.
 * Currently only version 1 exists so no migrations are needed yet;
 * this file demonstrates the pattern for future maintainers.
 */
const MIGRATIONS = new Map([
// Example – uncomment when v2 is introduced:
// [1, migrateV1ToV2],
]);
/**
 * Migrate a raw parsed JSON object to the current schema version.
 * Throws if the document version is newer than the library's version.
 */
export function migrate(raw) {
    const sourceVersion = typeof raw['schemaVersion'] === 'number'
        ? raw['schemaVersion']
        : 0;
    if (sourceVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error(`Cannot migrate: document schemaVersion ${sourceVersion} is newer ` +
            `than library schemaVersion ${CURRENT_SCHEMA_VERSION}. ` +
            `Please upgrade the annotation library.`);
    }
    if (sourceVersion === CURRENT_SCHEMA_VERSION) {
        return {
            document: raw,
            migrationsApplied: [],
        };
    }
    const migrationsApplied = [];
    let current = { ...raw };
    for (let v = sourceVersion; v < CURRENT_SCHEMA_VERSION; v++) {
        const fn = MIGRATIONS.get(v);
        if (!fn) {
            throw new Error(`No migration registered from schema version ${v} to ${v + 1}. ` +
                `The document cannot be upgraded.`);
        }
        current = fn(current);
        migrationsApplied.push(v);
    }
    return {
        document: current,
        migrationsApplied,
    };
}
/**
 * Returns true if the given raw document requires migration.
 */
export function needsMigration(raw) {
    const v = typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 0;
    return v < CURRENT_SCHEMA_VERSION;
}
//# sourceMappingURL=migrations.js.map