/**
 * @file index.ts
 * Public API surface for @company/annot-angular
 */

// Module
export { AnnotAngularModule } from './lib/annot-angular.module';

// Components
export { AnnotatorComponent } from './lib/components/annotator/annotator.component';
export { ToolbarComponent } from './lib/components/toolbar/toolbar.component';
export { AnnotationPanelComponent } from './lib/components/annotation-panel/annotation-panel.component';

// Services
export { AnnotationEngineService } from './lib/services/annotation-engine.service';
export { KeyboardHandlerService } from './lib/services/keyboard-handler.service';
