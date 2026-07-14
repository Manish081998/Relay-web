import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectionDto } from '../models/selection.model';
import { SelectionsService } from '../services/selections.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NOTIFICATION_MESSAGES as NM } from '../../../core/constants/notification-messages';

@Injectable()
export class SelectionsStore {
  private readonly svc        = inject(SelectionsService);
  private readonly notify     = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _selected = signal<SelectionDto | null>(null);
  private readonly _loading  = signal(false);
  private readonly _error    = signal<string | null>(null);

  readonly selected    = this._selected.asReadonly();
  readonly loading     = this._loading.asReadonly();
  readonly error       = this._error.asReadonly();
  readonly hasData     = computed(() => this._selected() !== null);
  readonly optionCount = computed(() => this._selected()?.options.length ?? 0);

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.svc.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this._selected.set(res.data);
        this._loading.set(false);
      },
      error: () => {
        this._error.set(NM.WEBTOOL.SELECTION.NOT_FOUND);
        this._loading.set(false);
        this.notify.error(NM.WEBTOOL.SELECTION.LOAD_FAILED, 'WebTool');
      },
    });
  }

  clearSelected(): void {
    this._selected.set(null);
    this._error.set(null);
  }
}
