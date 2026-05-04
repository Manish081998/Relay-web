import {
  Component, ChangeDetectionStrategy,
  ViewChild, model, input, output,
} from '@angular/core';
import type { Annotation } from '@adticorp/annot-core';
import { AnnotationViewerComponent } from '@adticorp/annot-angular';
import { Dialog } from 'primeng/dialog';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-annotation-dialog',
  standalone: true,
  imports: [AnnotationViewerComponent, Dialog, ButtonDirective],
  templateUrl: './annotation-dialog.component.html',
  styleUrl: './annotation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationDialogComponent {
  @ViewChild('viewer') private readonly viewerRef?: AnnotationViewerComponent;

  readonly visible = model<boolean>(false);
  readonly title   = input<string>('View Document');
  readonly fileUrl = input<string | null>(null);
  readonly mode    = input<'view' | 'upload'>('view');
  readonly author  = input<string>('Demo User');

  readonly annotationsChange = output<ReadonlyArray<Annotation>>();
  readonly saveComplete      = output<void>();

  close(): void {
    this.visible.set(false);
  }

  triggerUpload(): void {
    this.viewerRef?.saveAnnotated();
  }

  onAnnotationsChange(updated: ReadonlyArray<Annotation>): void {
    this.annotationsChange.emit(updated);
  }

  onSaveComplete(): void {
    this.saveComplete.emit();
  }
}
