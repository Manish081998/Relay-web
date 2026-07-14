/**
 * @file schema.ts
 * JSON-schema definition and runtime validation for the annotation format.
 * We hand-roll a lightweight validator so the runtime stays dependency-free.
 */
import { CURRENT_SCHEMA_VERSION } from './annotation.model.js';
// ─── JSON schema (informational / for tooling) ───────────────────────────────
/**
 * JSON Schema (draft-07) describing a single Annotation.
 * This is the canonical schema; import it for documentation or validation
 * tooling outside the browser bundle.
 */
export const ANNOTATION_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://company.internal/schemas/annotation/v1',
    title: 'Annotation',
    type: 'object',
    required: [
        'schemaVersion', 'id', 'docId', 'pageIndex', 'type',
        'author', 'createdAt', 'updatedAt', 'style', 'geometry', 'meta', 'isLocked',
    ],
    properties: {
        schemaVersion: { type: 'integer', minimum: 1 },
        id: { type: 'string', format: 'uuid' },
        docId: { type: 'string', minLength: 1 },
        pageIndex: { type: 'integer', minimum: 0 },
        type: {
            type: 'string',
            enum: ['highlight', 'freehand', 'text', 'comment', 'rectangle', 'ellipse', 'arrow', 'line'],
        },
        author: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        isLocked: { type: 'boolean' },
        style: {
            type: 'object',
            required: ['strokeColor', 'fillColor', 'opacity', 'strokeWidth'],
            properties: {
                strokeColor: { type: 'string' },
                fillColor: { type: 'string' },
                opacity: { type: 'number', minimum: 0, maximum: 1 },
                strokeWidth: { type: 'number', minimum: 0 },
                fontSize: { type: 'number', minimum: 1 },
                fontFamily: { type: 'string' },
                fontColor: { type: 'string' },
                dashPattern: { type: 'array', items: { type: 'number' } },
                lineJoin: { type: 'string', enum: ['miter', 'round', 'bevel'] },
                lineCap: { type: 'string', enum: ['butt', 'round', 'square'] },
            },
        },
        geometry: {
            oneOf: [
                {
                    type: 'object',
                    required: ['kind', 'rect'],
                    properties: {
                        kind: { const: 'rect' },
                        rect: { $ref: '#/$defs/Rect' },
                    },
                },
                {
                    type: 'object',
                    required: ['kind', 'points', 'closed', 'bounds'],
                    properties: {
                        kind: { const: 'path' },
                        points: { type: 'array', items: { $ref: '#/$defs/Point' } },
                        closed: { type: 'boolean' },
                        bounds: { $ref: '#/$defs/Rect' },
                    },
                },
                {
                    type: 'object',
                    required: ['kind', 'point'],
                    properties: {
                        kind: { const: 'point' },
                        point: { $ref: '#/$defs/Point' },
                    },
                },
                {
                    type: 'object',
                    required: ['kind', 'startPoint', 'endPoint', 'hasArrowHead', 'hasArrowTail'],
                    properties: {
                        kind: { const: 'line' },
                        startPoint: { $ref: '#/$defs/Point' },
                        endPoint: { $ref: '#/$defs/Point' },
                        hasArrowHead: { type: 'boolean' },
                        hasArrowTail: { type: 'boolean' },
                    },
                },
            ],
        },
        meta: {
            type: 'object',
            properties: {
                text: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                status: { type: 'string', enum: ['open', 'resolved', 'wontfix'] },
                collapsed: { type: 'boolean' },
                comments: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['id', 'author', 'text', 'createdAt'],
                        properties: {
                            id: { type: 'string' },
                            author: { type: 'string' },
                            text: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
    },
    $defs: {
        Point: {
            type: 'object',
            required: ['x', 'y'],
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
            },
        },
        Rect: {
            type: 'object',
            required: ['x', 'y', 'width', 'height'],
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number', minimum: 0 },
                height: { type: 'number', minimum: 0 },
            },
        },
    },
};
// ─── Runtime validators ──────────────────────────────────────────────────────
function isString(v) {
    return typeof v === 'string';
}
function isNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}
function isBoolean(v) {
    return typeof v === 'boolean';
}
function isObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function isArray(v) {
    return Array.isArray(v);
}
const VALID_TYPES = new Set([
    'highlight', 'freehand', 'text', 'comment',
    'rectangle', 'ellipse', 'arrow', 'line',
]);
function validatePoint(v, path, errors) {
    if (!isObject(v)) {
        errors.push(`${path}: expected object`);
        return;
    }
    if (!isNumber(v['x']))
        errors.push(`${path}.x: expected number`);
    if (!isNumber(v['y']))
        errors.push(`${path}.y: expected number`);
}
function validateRect(v, path, errors) {
    if (!isObject(v)) {
        errors.push(`${path}: expected object`);
        return;
    }
    if (!isNumber(v['x']))
        errors.push(`${path}.x: expected number`);
    if (!isNumber(v['y']))
        errors.push(`${path}.y: expected number`);
    if (!isNumber(v['width']) || v['width'] < 0)
        errors.push(`${path}.width: expected non-negative number`);
    if (!isNumber(v['height']) || v['height'] < 0)
        errors.push(`${path}.height: expected non-negative number`);
}
function validateStyle(v, errors) {
    const path = 'style';
    if (!isObject(v)) {
        errors.push(`${path}: expected object`);
        return;
    }
    if (!isString(v['strokeColor']))
        errors.push(`${path}.strokeColor: expected string`);
    if (!isString(v['fillColor']))
        errors.push(`${path}.fillColor: expected string`);
    if (!isNumber(v['opacity']) || v['opacity'] < 0 || v['opacity'] > 1) {
        errors.push(`${path}.opacity: expected number in [0,1]`);
    }
    if (!isNumber(v['strokeWidth']) || v['strokeWidth'] < 0) {
        errors.push(`${path}.strokeWidth: expected non-negative number`);
    }
}
function validateGeometry(v, errors) {
    const path = 'geometry';
    if (!isObject(v)) {
        errors.push(`${path}: expected object`);
        return;
    }
    const kind = v['kind'];
    if (kind === 'rect') {
        validateRect(v['rect'], `${path}.rect`, errors);
    }
    else if (kind === 'path') {
        if (!isArray(v['points'])) {
            errors.push(`${path}.points: expected array`);
        }
        else {
            v['points'].forEach((p, i) => validatePoint(p, `${path}.points[${i}]`, errors));
        }
        if (!isBoolean(v['closed']))
            errors.push(`${path}.closed: expected boolean`);
        validateRect(v['bounds'], `${path}.bounds`, errors);
    }
    else if (kind === 'point') {
        validatePoint(v['point'], `${path}.point`, errors);
    }
    else if (kind === 'line') {
        validatePoint(v['startPoint'], `${path}.startPoint`, errors);
        validatePoint(v['endPoint'], `${path}.endPoint`, errors);
        if (!isBoolean(v['hasArrowHead']))
            errors.push(`${path}.hasArrowHead: expected boolean`);
        if (!isBoolean(v['hasArrowTail']))
            errors.push(`${path}.hasArrowTail: expected boolean`);
    }
    else {
        errors.push(`${path}.kind: unknown kind "${String(kind)}"`);
    }
}
/** Validate a single Annotation object (runtime check) */
export function validateAnnotation(v) {
    const errors = [];
    if (!isObject(v)) {
        return { valid: false, errors: ['root: expected object'] };
    }
    if (!isNumber(v['schemaVersion']))
        errors.push('schemaVersion: expected number');
    if (!isString(v['id']))
        errors.push('id: expected string');
    if (!isString(v['docId']) || !v['docId'].length)
        errors.push('docId: expected non-empty string');
    if (!isNumber(v['pageIndex']) || v['pageIndex'] < 0)
        errors.push('pageIndex: expected non-negative integer');
    if (!isString(v['type']) || !VALID_TYPES.has(v['type']))
        errors.push(`type: must be one of ${[...VALID_TYPES].join(', ')}`);
    if (!isString(v['author']))
        errors.push('author: expected string');
    if (!isString(v['createdAt']))
        errors.push('createdAt: expected string');
    if (!isString(v['updatedAt']))
        errors.push('updatedAt: expected string');
    if (!isBoolean(v['isLocked']))
        errors.push('isLocked: expected boolean');
    validateStyle(v['style'], errors);
    validateGeometry(v['geometry'], errors);
    if (!isObject(v['meta']))
        errors.push('meta: expected object');
    return { valid: errors.length === 0, errors };
}
/** Validate an AnnotationDocument envelope */
export function validateAnnotationDocument(v) {
    const errors = [];
    if (!isObject(v)) {
        return { valid: false, errors: ['root: expected object'] };
    }
    if (!isNumber(v['schemaVersion']))
        errors.push('schemaVersion: expected number');
    if (v['schemaVersion'] > CURRENT_SCHEMA_VERSION) {
        errors.push(`schemaVersion: document version ${String(v['schemaVersion'])} > library version ${CURRENT_SCHEMA_VERSION}`);
    }
    if (!isString(v['docId']))
        errors.push('docId: expected string');
    if (!isString(v['exportedAt']))
        errors.push('exportedAt: expected string');
    if (!isArray(v['annotations'])) {
        errors.push('annotations: expected array');
    }
    else {
        v['annotations'].forEach((a, i) => {
            const result = validateAnnotation(a);
            if (!result.valid) {
                errors.push(...result.errors.map(e => `annotations[${i}].${e}`));
            }
        });
    }
    return { valid: errors.length === 0, errors };
}
/** Cast validated unknown to typed document (throws on invalid) */
export function assertAnnotationDocument(v) {
    const result = validateAnnotationDocument(v);
    if (!result.valid) {
        throw new Error(`Invalid AnnotationDocument:\n${result.errors.join('\n')}`);
    }
    return v;
}
/** Cast validated unknown to typed annotation (throws on invalid) */
export function assertAnnotation(v) {
    const result = validateAnnotation(v);
    if (!result.valid) {
        throw new Error(`Invalid Annotation:\n${result.errors.join('\n')}`);
    }
    return v;
}
//# sourceMappingURL=schema.js.map