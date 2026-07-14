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
/** Serialise annotations to a JSON string */
export declare function exportToJson(docId: string, annotations: ReadonlyArray<Annotation>, indent?: number): string;
/** Trigger a browser file download of the annotation JSON */
export declare function downloadJson(docId: string, annotations: ReadonlyArray<Annotation>, filename?: string): void;
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
export declare function importFromJson(json: string): ImportResult;
/**
 * Open a file-picker dialog and import the selected JSON file.
 * Returns a Promise that resolves with the ImportResult.
 */
export declare function importFromFile(): Promise<ImportResult>;
/** Copy selected annotations to the system clipboard as JSON */
export declare function copyToClipboard(annotations: ReadonlyArray<Annotation>): Promise<void>;
/** Paste annotations from the system clipboard (offsets position to avoid overlap) */
export declare function pasteFromClipboard(docId: string, pageIndex: number, offset?: {
    x: number;
    y: number;
}): Promise<Annotation[]>;
//# sourceMappingURL=serializer.d.ts.map