import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentDto, UpdateDocumentRequest } from '../models/document.model';
import { AnnotationDto } from '../models/annotation.model';
import { DocumentsService } from '../services/documents.service';
import { AnnotationsService } from '../services/annotations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NOTIFICATION_MESSAGES as NM } from '../../../core/constants/notification-messages';

@Injectable()
export class DocumentsStore {

  private readonly docSvc = inject(DocumentsService);
  private readonly annSvc = inject(AnnotationsService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _selected = signal<DocumentDto | null>(null);
  private readonly _annotation = signal<AnnotationDto | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly selected = this._selected.asReadonly();
  readonly annotation = this._annotation.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasData = computed(() => this._selected() !== null);

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.docSvc
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._selected.set(res.data);
          this._loading.set(false);
        },
        error: () => {
          this._error.set(NM.DOCUMENTUM.DOCUMENT.NOT_FOUND);
          this._loading.set(false);
          this.notify.error(NM.DOCUMENTUM.DOCUMENT.LOAD_FAILED, 'Documentum');
        },
      });
  }

  loadByName(name: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.docSvc
      .getByName(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._selected.set(res.data);
          this._loading.set(false);
        },
        error: () => {
          this._error.set(NM.DOCUMENTUM.DOCUMENT.NOT_FOUND);
          this._loading.set(false);
          this.notify.error(NM.DOCUMENTUM.DOCUMENT.LOAD_FAILED, 'Documentum');
        },
      });
  }

  update(id: string, body: UpdateDocumentRequest): void {
    this._saving.set(true);
    this.docSvc
      .update(id, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._selected.set(res.data);
          this._saving.set(false);
          this.notify.success(NM.DOCUMENTUM.DOCUMENT.UPDATE_SUCCESS, 'Documentum');
        },
        error: () => {
          this._saving.set(false);
          this.notify.error(NM.DOCUMENTUM.DOCUMENT.UPDATE_FAILED, 'Documentum');
        },
      });
  }

  loadAnnotationById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.annSvc
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._annotation.set(res.data);
          this._loading.set(false);
        },
        error: () => {
          this._error.set(NM.DOCUMENTUM.ANNOTATION.NOT_FOUND);
          this._loading.set(false);
          this.notify.error(NM.DOCUMENTUM.ANNOTATION.LOAD_FAILED, 'Documentum');
        },
      });
  }

  clearSelected(): void {
    this._selected.set(null);
    this._annotation.set(null);
    this._error.set(null);
  }
}
