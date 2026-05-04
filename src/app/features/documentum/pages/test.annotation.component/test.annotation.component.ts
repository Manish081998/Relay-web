import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import type { Annotation } from '@adticorp/annot-core';
import { NgFor } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { NotificationService } from '../../../../core/services/notification.service';
import { AnnotationDialogComponent } from '../../components/annotation-dialog/annotation-dialog.component';

export interface DocumentRecord {
  id: number;
  name: string;
  fileUrl: string;
}

@Component({
  selector: 'app-test-annotation',
  standalone: true,
  imports: [AnnotationDialogComponent, ButtonDirective, NgFor],
  templateUrl: './test.annotation.component.html',
  styleUrl: './test.annotation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestAnnotationComponent {
  private readonly notify = inject(NotificationService);

  readonly documents: DocumentRecord[] = [
    { id: 1, name: 'Q1 Payslip — March 2025',       fileUrl: 'assets/documentum/70-024253-00D.pdf' },
    { id: 2, name: 'Employment Contract',             fileUrl: 'assets/documentum/ADTI_TEAM.jpg' },
    { id: 3, name: 'Project Proposal — Alpha',        fileUrl: 'assets/documentum/FSAFB24-SR-S-actuator-spec-6634.pdf' },
    { id: 4, name: 'Invoice #INV-2025-042',           fileUrl: 'assets/documentum/clean_payslip.pdf' },
  ];

  readonly modalMode    = signal<'view' | 'upload'>('view');
  readonly modalFileUrl = signal<string | null>(null);
  readonly selectedDoc  = signal<DocumentRecord | null>(null);
  readonly annotations  = signal<ReadonlyArray<Annotation>>([]);

  private readonly _modalOpen = signal(false);
  get dialogVisible(): boolean   { return this._modalOpen(); }
  set dialogVisible(v: boolean)  { this._modalOpen.set(v); }

  openForView(doc: DocumentRecord): void {
    this.selectedDoc.set(doc);
    this.modalFileUrl.set(doc.fileUrl);
    this.modalMode.set('view');
    this._modalOpen.set(true);
  }

  openForUpload(doc: DocumentRecord): void {
    this.selectedDoc.set(doc);
    this.modalFileUrl.set(doc.fileUrl);
    this.modalMode.set('upload');
    this._modalOpen.set(true);
  }

  openNewUpload(): void {
    this.selectedDoc.set(null);
    this.modalFileUrl.set(null);
    this.modalMode.set('upload');
    this._modalOpen.set(true);
  }

  closeModal(): void { this._modalOpen.set(false); }

  onAnnotationsChange(updated: ReadonlyArray<Annotation>): void {
    this.annotations.set(updated);
  }

  onSaveComplete(): void {
    this.notify.success('Annotations saved successfully.', 'Upload Complete');
    this.closeModal();
  }

  dialogTitle(): string {
    if (this.modalMode() === 'upload') {
      return this.selectedDoc() ? `Annotate — ${this.selectedDoc()!.name}` : 'Upload New Document';
    }
    return this.selectedDoc()?.name ?? 'View Document';
  }
}
