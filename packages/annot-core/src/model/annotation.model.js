/**
 * @file annotation.model.ts
 * Core annotation data model – every type in this file represents
 * a value that may be serialised to JSON and stored / transmitted.
 *
 * COORDINATE CONVENTION
 * All geometry is stored in *document coordinates* (the native
 * coordinate space of the document being annotated, e.g. PDF user
 * units, image pixels).  The adapter layer is responsible for
 * converting between document ↔ screen coordinates at render time.
 */
// ─── Default factory helpers ─────────────────────────────────────────────────
export const CURRENT_SCHEMA_VERSION = 1;
export const DEFAULT_STYLE = {
    strokeColor: '#FF3B30',
    fillColor: 'rgba(255,59,48,0.2)',
    opacity: 1,
    strokeWidth: 2,
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    fontColor: '#000000',
    dashPattern: [],
    lineJoin: 'round',
    lineCap: 'round',
};
export const DEFAULT_HIGHLIGHT_STYLE = {
    ...DEFAULT_STYLE,
    strokeColor: 'rgba(255,204,0,0)',
    fillColor: 'rgba(255,204,0,0.4)',
    opacity: 1,
    strokeWidth: 0,
};
export const DEFAULT_FREEHAND_STYLE = {
    ...DEFAULT_STYLE,
    strokeColor: '#007AFF',
    fillColor: 'transparent',
    strokeWidth: 3,
    lineCap: 'round',
    lineJoin: 'round',
};
export const DEFAULT_TEXT_STYLE = {
    ...DEFAULT_STYLE,
    strokeColor: '#007AFF',
    fillColor: 'rgba(255,255,255,0.85)',
    strokeWidth: 1,
    fontSize: 14,
    fontColor: '#1C1C1E',
};
export const DEFAULT_COMMENT_STYLE = {
    ...DEFAULT_STYLE,
    strokeColor: '#FF9500',
    fillColor: '#FF9500',
    opacity: 1,
    strokeWidth: 0,
};
//# sourceMappingURL=annotation.model.js.map