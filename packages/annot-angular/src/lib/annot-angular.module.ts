import { NgModule } from '@angular/core';
import { AnnotatorComponent } from './components/annotator/annotator.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { AnnotationPanelComponent } from './components/annotation-panel/annotation-panel.component';
import { AnnotationViewerComponent } from './components/annotation-viewer/annotation-viewer.component';

const COMPONENTS = [
  AnnotatorComponent,
  ToolbarComponent,
  AnnotationPanelComponent,
  AnnotationViewerComponent,
];

@NgModule({
  imports: COMPONENTS,
  exports: COMPONENTS,
})
export class AnnotAngularModule {}
