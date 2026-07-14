/**
 * @file index.ts
 * Public API surface for @company/annot-core
 */
export { CURRENT_SCHEMA_VERSION, DEFAULT_STYLE, DEFAULT_HIGHLIGHT_STYLE, DEFAULT_FREEHAND_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_COMMENT_STYLE, } from './model/annotation.model.js';
export { ANNOTATION_JSON_SCHEMA, validateAnnotation, validateAnnotationDocument, assertAnnotation, assertAnnotationDocument, } from './model/schema.js';
export { migrate, needsMigration } from './model/migrations.js';
export { pt, addPt, subPt, scalePt, distance, distanceSq, midPoint, clampPt, pointAngleDeg, rectFromPoints, rectCenter, rectContainsPoint, rectsIntersect, rectUnion, rectInflate, rectTranslate, rectResizeByHandle, rectHandlePoints, pointsBounds, pointToSegmentDistanceSq, simplifyPath, pointInEllipse, pointToEllipseEdgeDistanceSq, arrowHead, } from './geometry/geometry.js';
export { DEFAULT_HIT_TOLERANCE, HANDLE_HIT_RADIUS, hitTestHandle, hitTestAnnotation, hitTestAll, hitTestLasso, selectionBounds, getAnnotationBounds, } from './geometry/hit-test.js';
export { TypedEventEmitter } from './events/event-emitter.js';
export { NullCommand } from './commands/command.interface.js';
export { CommandStack, DEFAULT_MAX_HISTORY } from './commands/command-stack.js';
export { AddAnnotationCommand, RemoveAnnotationCommand, RemoveAnnotationsCommand, UpdateAnnotationCommand, MoveAnnotationsCommand, ResizeAnnotationCommand, StyleAnnotationsCommand, BatchCommand, } from './commands/annotation-commands.js';
export { AnnotationStore } from './store/annotation-store.js';
export { screenRectToDoc } from './adapter/viewport-adapter.interface.js';
export { SingleSurfaceAdapter, MultiPageScrollAdapter } from './adapter/default-adapter.js';
export { TOOL_IDS } from './tools/tool.interface.js';
export { SelectTool } from './tools/select.tool.js';
export { ShapeTool } from './tools/shape.tool.js';
export { FreehandTool } from './tools/freehand.tool.js';
export { FreehandHighlightTool } from './tools/freehand-highlight.tool.js';
export { TextTool } from './tools/text.tool.js';
export { CommentTool } from './tools/comment.tool.js';
export { EraserToolWithUndo as EraserTool } from './tools/eraser.tool.js';
export { generateId, sanitiseText, desanitiseText, buildAnnotation } from './tools/tool-helpers.js';
export { exportToJson, downloadJson, importFromJson, importFromFile, copyToClipboard, pasteFromClipboard, } from './serialization/serializer.js';
//# sourceMappingURL=index.js.map