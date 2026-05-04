// ── Module ────────────────────────────────────────────────────────────────────
export { AnnotAngularModule } from './lib/annot-angular.module';

// ── Components ────────────────────────────────────────────────────────────────
export { AnnotationViewerComponent } from './lib/components/annotation-viewer/annotation-viewer.component';
export { AnnotatorComponent }        from './lib/components/annotator/annotator.component';
export { ToolbarComponent }          from './lib/components/toolbar/toolbar.component';
export { AnnotationPanelComponent }  from './lib/components/annotation-panel/annotation-panel.component';

// ── Services ──────────────────────────────────────────────────────────────────
export { AnnotationEngineService } from './lib/services/annotation-engine.service';
export { KeyboardHandlerService }  from './lib/services/keyboard-handler.service';

// ── Adapters ──────────────────────────────────────────────────────────────────
export { PdfViewportAdapter }   from './lib/adapters/pdf-viewport-adapter';
export type { PdfPageLayout }   from './lib/adapters/pdf-viewport-adapter';
export { ImageViewportAdapter } from './lib/adapters/image-viewport-adapter';
export { EmailViewportAdapter } from './lib/adapters/email-viewport-adapter';

// ── Utilities ─────────────────────────────────────────────────────────────────
export { detectContentType, contentTypeLabel, acceptForContentType } from './lib/utils/content-detector';
export type { ContentType } from './lib/utils/content-detector';
export { parseEml }                    from './lib/utils/eml-parser';
export type { ParsedEmail }            from './lib/utils/eml-parser';
export { flattenAnnotationsToPdf, getPdfPageDimensions } from './lib/utils/pdf-flattener';
export { flattenAnnotationsToImage }   from './lib/utils/image-flattener';
