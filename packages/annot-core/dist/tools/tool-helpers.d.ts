/**
 * @file tool-helpers.ts
 * Shared utility functions used by multiple tool implementations.
 */
import type { Annotation, AnnotationStyle, AnnotationGeometry } from '../model/annotation.model.js';
/** Generate a simple unique ID (UUID-like for browser use without crypto) */
export declare function generateId(): string;
/** Sanitise user-entered text to prevent XSS */
export declare function sanitiseText(raw: string): string;
/** De-sanitise for display (convert HTML entities back to chars) */
export declare function desanitiseText(safe: string): string;
/** Build a skeleton Annotation with all required fields */
export declare function buildAnnotation(docId: string, pageIndex: number, type: Annotation['type'], author: string, style: AnnotationStyle, geometry: AnnotationGeometry, metaText?: string): Annotation;
//# sourceMappingURL=tool-helpers.d.ts.map