/**
 * @file index.ts
 * Public API surface for @company/annot-core
 */
export type { Point, Rect, AnnotationType, AnnotationStyle, AnnotationGeometry, RectGeometry, PathGeometry, PointGeometry, LineGeometry, AnnotationMeta, CommentReply, Annotation, AnnotationDocument, } from './model/annotation.model.js';
export { CURRENT_SCHEMA_VERSION, DEFAULT_STYLE, DEFAULT_HIGHLIGHT_STYLE, DEFAULT_FREEHAND_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_COMMENT_STYLE, } from './model/annotation.model.js';
export type { ValidationResult } from './model/schema.js';
export { ANNOTATION_JSON_SCHEMA, validateAnnotation, validateAnnotationDocument, assertAnnotation, assertAnnotationDocument, } from './model/schema.js';
export type { MigrationResult } from './model/migrations.js';
export { migrate, needsMigration } from './model/migrations.js';
export type { HandleIndex, ArrowHeadPoints } from './geometry/geometry.js';
export { pt, addPt, subPt, scalePt, distance, distanceSq, midPoint, clampPt, pointAngleDeg, rectFromPoints, rectCenter, rectContainsPoint, rectsIntersect, rectUnion, rectInflate, rectTranslate, rectResizeByHandle, rectHandlePoints, pointsBounds, pointToSegmentDistanceSq, simplifyPath, pointInEllipse, pointToEllipseEdgeDistanceSq, arrowHead, } from './geometry/geometry.js';
export type { HitTestResult } from './geometry/hit-test.js';
export { DEFAULT_HIT_TOLERANCE, HANDLE_HIT_RADIUS, hitTestHandle, hitTestAnnotation, hitTestAll, hitTestLasso, selectionBounds, getAnnotationBounds, } from './geometry/hit-test.js';
export type { Listener, Unsubscribe, EventMap } from './events/event-emitter.js';
export { TypedEventEmitter } from './events/event-emitter.js';
export type { Command } from './commands/command.interface.js';
export { NullCommand } from './commands/command.interface.js';
export type { CommandStackState, CommandStackEvents } from './commands/command-stack.js';
export { CommandStack, DEFAULT_MAX_HISTORY } from './commands/command-stack.js';
export { AddAnnotationCommand, RemoveAnnotationCommand, RemoveAnnotationsCommand, UpdateAnnotationCommand, MoveAnnotationsCommand, ResizeAnnotationCommand, StyleAnnotationsCommand, BatchCommand, } from './commands/annotation-commands.js';
export type { AnnotationStoreEvents } from './store/annotation-store.js';
export { AnnotationStore } from './store/annotation-store.js';
export type { ViewportTransform, PageInfo, ViewportAdapter } from './adapter/viewport-adapter.interface.js';
export { screenRectToDoc } from './adapter/viewport-adapter.interface.js';
export type { SingleSurfaceAdapterOptions, MultiPageAdapterOptions, PageLayout } from './adapter/default-adapter.js';
export { SingleSurfaceAdapter, MultiPageScrollAdapter } from './adapter/default-adapter.js';
export type { Tool, ToolContext, ToolPointerEvent, ToolCursor } from './tools/tool.interface.js';
export { TOOL_IDS } from './tools/tool.interface.js';
export type { ToolId } from './tools/tool.interface.js';
export { SelectTool } from './tools/select.tool.js';
export { ShapeTool } from './tools/shape.tool.js';
export { FreehandTool } from './tools/freehand.tool.js';
export { FreehandHighlightTool } from './tools/freehand-highlight.tool.js';
export { TextTool } from './tools/text.tool.js';
export { CommentTool } from './tools/comment.tool.js';
export { EraserToolWithUndo as EraserTool } from './tools/eraser.tool.js';
export { generateId, sanitiseText, desanitiseText, buildAnnotation } from './tools/tool-helpers.js';
export type { ImportResult } from './serialization/serializer.js';
export { exportToJson, downloadJson, importFromJson, importFromFile, copyToClipboard, pasteFromClipboard, } from './serialization/serializer.js';
//# sourceMappingURL=index.d.ts.map