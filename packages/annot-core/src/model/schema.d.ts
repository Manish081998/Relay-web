/**
 * @file schema.ts
 * JSON-schema definition and runtime validation for the annotation format.
 * We hand-roll a lightweight validator so the runtime stays dependency-free.
 */
import type { Annotation, AnnotationDocument } from './annotation.model.js';
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: ReadonlyArray<string>;
}
/**
 * JSON Schema (draft-07) describing a single Annotation.
 * This is the canonical schema; import it for documentation or validation
 * tooling outside the browser bundle.
 */
export declare const ANNOTATION_JSON_SCHEMA: {
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly $id: "https://company.internal/schemas/annotation/v1";
    readonly title: "Annotation";
    readonly type: "object";
    readonly required: readonly ["schemaVersion", "id", "docId", "pageIndex", "type", "author", "createdAt", "updatedAt", "style", "geometry", "meta", "isLocked"];
    readonly properties: {
        readonly schemaVersion: {
            readonly type: "integer";
            readonly minimum: 1;
        };
        readonly id: {
            readonly type: "string";
            readonly format: "uuid";
        };
        readonly docId: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly pageIndex: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["highlight", "freehand", "text", "comment", "rectangle", "ellipse", "arrow", "line"];
        };
        readonly author: {
            readonly type: "string";
        };
        readonly createdAt: {
            readonly type: "string";
            readonly format: "date-time";
        };
        readonly updatedAt: {
            readonly type: "string";
            readonly format: "date-time";
        };
        readonly isLocked: {
            readonly type: "boolean";
        };
        readonly style: {
            readonly type: "object";
            readonly required: readonly ["strokeColor", "fillColor", "opacity", "strokeWidth"];
            readonly properties: {
                readonly strokeColor: {
                    readonly type: "string";
                };
                readonly fillColor: {
                    readonly type: "string";
                };
                readonly opacity: {
                    readonly type: "number";
                    readonly minimum: 0;
                    readonly maximum: 1;
                };
                readonly strokeWidth: {
                    readonly type: "number";
                    readonly minimum: 0;
                };
                readonly fontSize: {
                    readonly type: "number";
                    readonly minimum: 1;
                };
                readonly fontFamily: {
                    readonly type: "string";
                };
                readonly fontColor: {
                    readonly type: "string";
                };
                readonly dashPattern: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "number";
                    };
                };
                readonly lineJoin: {
                    readonly type: "string";
                    readonly enum: readonly ["miter", "round", "bevel"];
                };
                readonly lineCap: {
                    readonly type: "string";
                    readonly enum: readonly ["butt", "round", "square"];
                };
            };
        };
        readonly geometry: {
            readonly oneOf: readonly [{
                readonly type: "object";
                readonly required: readonly ["kind", "rect"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "rect";
                    };
                    readonly rect: {
                        readonly $ref: "#/$defs/Rect";
                    };
                };
            }, {
                readonly type: "object";
                readonly required: readonly ["kind", "points", "closed", "bounds"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "path";
                    };
                    readonly points: {
                        readonly type: "array";
                        readonly items: {
                            readonly $ref: "#/$defs/Point";
                        };
                    };
                    readonly closed: {
                        readonly type: "boolean";
                    };
                    readonly bounds: {
                        readonly $ref: "#/$defs/Rect";
                    };
                };
            }, {
                readonly type: "object";
                readonly required: readonly ["kind", "point"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "point";
                    };
                    readonly point: {
                        readonly $ref: "#/$defs/Point";
                    };
                };
            }, {
                readonly type: "object";
                readonly required: readonly ["kind", "startPoint", "endPoint", "hasArrowHead", "hasArrowTail"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "line";
                    };
                    readonly startPoint: {
                        readonly $ref: "#/$defs/Point";
                    };
                    readonly endPoint: {
                        readonly $ref: "#/$defs/Point";
                    };
                    readonly hasArrowHead: {
                        readonly type: "boolean";
                    };
                    readonly hasArrowTail: {
                        readonly type: "boolean";
                    };
                };
            }];
        };
        readonly meta: {
            readonly type: "object";
            readonly properties: {
                readonly text: {
                    readonly type: "string";
                };
                readonly tags: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly status: {
                    readonly type: "string";
                    readonly enum: readonly ["open", "resolved", "wontfix"];
                };
                readonly collapsed: {
                    readonly type: "boolean";
                };
                readonly comments: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["id", "author", "text", "createdAt"];
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly author: {
                                readonly type: "string";
                            };
                            readonly text: {
                                readonly type: "string";
                            };
                            readonly createdAt: {
                                readonly type: "string";
                                readonly format: "date-time";
                            };
                        };
                    };
                };
            };
        };
    };
    readonly $defs: {
        readonly Point: {
            readonly type: "object";
            readonly required: readonly ["x", "y"];
            readonly properties: {
                readonly x: {
                    readonly type: "number";
                };
                readonly y: {
                    readonly type: "number";
                };
            };
        };
        readonly Rect: {
            readonly type: "object";
            readonly required: readonly ["x", "y", "width", "height"];
            readonly properties: {
                readonly x: {
                    readonly type: "number";
                };
                readonly y: {
                    readonly type: "number";
                };
                readonly width: {
                    readonly type: "number";
                    readonly minimum: 0;
                };
                readonly height: {
                    readonly type: "number";
                    readonly minimum: 0;
                };
            };
        };
    };
};
/** Validate a single Annotation object (runtime check) */
export declare function validateAnnotation(v: unknown): ValidationResult;
/** Validate an AnnotationDocument envelope */
export declare function validateAnnotationDocument(v: unknown): ValidationResult;
/** Cast validated unknown to typed document (throws on invalid) */
export declare function assertAnnotationDocument(v: unknown): AnnotationDocument;
/** Cast validated unknown to typed annotation (throws on invalid) */
export declare function assertAnnotation(v: unknown): Annotation;
//# sourceMappingURL=schema.d.ts.map