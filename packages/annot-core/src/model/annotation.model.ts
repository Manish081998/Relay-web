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

// ─── Primitives ────────────────────────────────────────────────────────────

/** 2-D point in document coordinates */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Axis-aligned bounding box in document coordinates */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// ─── Annotation Types ───────────────────────────────────────────────────────

export type AnnotationType =
  | 'highlight'
  | 'freehand'
  | 'text'
  | 'comment'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line';

// ─── Style ──────────────────────────────────────────────────────────────────

/** Visual properties shared by all annotation types */
export interface AnnotationStyle {
  /** CSS colour string for stroke / border (e.g. "#ff0000", "rgba(255,0,0,0.5)") */
  readonly strokeColor: string;
  /** CSS colour string for fill / highlight colour */
  readonly fillColor: string;
  /** Overall opacity 0..1 */
  readonly opacity: number;
  /** Stroke width in document units */
  readonly strokeWidth: number;
  /** Font size in pt for text-bearing annotations */
  readonly fontSize?: number;
  /** Font family for text-bearing annotations */
  readonly fontFamily?: string;
  /** CSS colour for text */
  readonly fontColor?: string;
  /** Dash pattern [solid, gap] in document units; empty = solid */
  readonly dashPattern?: ReadonlyArray<number>;
  /** Line join style */
  readonly lineJoin?: 'miter' | 'round' | 'bevel';
  /** Line cap style */
  readonly lineCap?: 'butt' | 'round' | 'square';
}

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Discriminated union for annotation geometry */
export type AnnotationGeometry =
  | RectGeometry
  | PathGeometry
  | PointGeometry
  | LineGeometry;

export interface RectGeometry {
  readonly kind: 'rect';
  /** Bounding rect in document coordinates */
  readonly rect: Rect;
}

export interface PathGeometry {
  readonly kind: 'path';
  /** Ordered list of points forming the path */
  readonly points: ReadonlyArray<Point>;
  /** True if the path is closed (last point connects to first) */
  readonly closed: boolean;
  /** Bounding box (cached – must be kept in sync when points change) */
  readonly bounds: Rect;
}

export interface PointGeometry {
  readonly kind: 'point';
  /** Anchor point (e.g. comment pin) */
  readonly point: Point;
}

export interface LineGeometry {
  readonly kind: 'line';
  readonly startPoint: Point;
  readonly endPoint: Point;
  /** Whether to draw an arrowhead at the end */
  readonly hasArrowHead: boolean;
  /** Whether to draw an arrowhead at the start */
  readonly hasArrowTail: boolean;
}

// ─── Meta ────────────────────────────────────────────────────────────────────

export interface CommentReply {
  readonly id: string;
  readonly author: string;
  /** Sanitised plain text */
  readonly text: string;
  readonly createdAt: string; // ISO-8601
}

export interface AnnotationMeta {
  /** Sanitised plain text for text boxes / sticky notes */
  readonly text?: string;
  /** Structured comment thread attached to this annotation */
  readonly comments?: ReadonlyArray<CommentReply>;
  /** User-defined tags */
  readonly tags?: ReadonlyArray<string>;
  /** Workflow status */
  readonly status?: 'open' | 'resolved' | 'wontfix';
  /** Whether this annotation is collapsed in the panel */
  readonly collapsed?: boolean;
}

// ─── Core Annotation ─────────────────────────────────────────────────────────

/** The core annotation record – serialisable to JSON */
export interface Annotation {
  /** Schema version at time of creation */
  readonly schemaVersion: number;
  /** Unique stable identifier (UUID v4) */
  readonly id: string;
  /** Identifies the host document (passed from the host app) */
  readonly docId: string;
  /** Zero-based page / surface index */
  readonly pageIndex: number;
  readonly type: AnnotationType;
  /** Display name of the author */
  readonly author: string;
  /** ISO-8601 creation timestamp */
  readonly createdAt: string;
  /** ISO-8601 last-update timestamp */
  readonly updatedAt: string;
  readonly style: AnnotationStyle;
  readonly geometry: AnnotationGeometry;
  readonly meta: AnnotationMeta;
  /** If true, the annotation cannot be moved or edited */
  readonly isLocked: boolean;
}

// ─── Document Export Container ───────────────────────────────────────────────

/** Serialisation envelope written when exporting annotations */
export interface AnnotationDocument {
  readonly schemaVersion: number;
  readonly docId: string;
  readonly exportedAt: string; // ISO-8601
  readonly annotations: ReadonlyArray<Annotation>;
}

// ─── Default factory helpers ─────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_STYLE: Readonly<AnnotationStyle> = {
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
} as const;

export const DEFAULT_HIGHLIGHT_STYLE: Readonly<AnnotationStyle> = {
  ...DEFAULT_STYLE,
  strokeColor: 'rgba(255,204,0,0)',
  fillColor: 'rgba(255,204,0,0.4)',
  opacity: 1,
  strokeWidth: 0,
} as const;

export const DEFAULT_FREEHAND_STYLE: Readonly<AnnotationStyle> = {
  ...DEFAULT_STYLE,
  strokeColor: '#007AFF',
  fillColor: 'transparent',
  strokeWidth: 3,
  lineCap: 'round',
  lineJoin: 'round',
} as const;

export const DEFAULT_TEXT_STYLE: Readonly<AnnotationStyle> = {
  ...DEFAULT_STYLE,
  strokeColor: '#007AFF',
  fillColor: 'rgba(255,255,255,0.85)',
  strokeWidth: 1,
  fontSize: 14,
  fontColor: '#1C1C1E',
} as const;

export const DEFAULT_COMMENT_STYLE: Readonly<AnnotationStyle> = {
  ...DEFAULT_STYLE,
  strokeColor: '#FF9500',
  fillColor: '#FF9500',
  opacity: 1,
  strokeWidth: 0,
} as const;
