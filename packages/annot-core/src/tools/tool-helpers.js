/**
 * @file tool-helpers.ts
 * Shared utility functions used by multiple tool implementations.
 */
import { CURRENT_SCHEMA_VERSION } from '../model/annotation.model.js';
let _idCounter = 0;
/** Generate a simple unique ID (UUID-like for browser use without crypto) */
export function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 9);
    return `${ts}-${rand}-${++_idCounter}`;
}
/** Sanitise user-entered text to prevent XSS */
export function sanitiseText(raw) {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
/** De-sanitise for display (convert HTML entities back to chars) */
export function desanitiseText(safe) {
    return safe
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
}
/** Build a skeleton Annotation with all required fields */
export function buildAnnotation(docId, pageIndex, type, author, style, geometry, metaText) {
    const now = new Date().toISOString();
    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: generateId(),
        docId,
        pageIndex,
        type,
        author,
        createdAt: now,
        updatedAt: now,
        style,
        geometry,
        meta: metaText !== undefined ? { text: metaText } : {},
        isLocked: false,
    };
}
//# sourceMappingURL=tool-helpers.js.map