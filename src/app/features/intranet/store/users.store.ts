import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserDetailDto, UpdateUserRequest } from '../models/user-detail.model';
import { UsersService } from '../services/users.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NOTIFICATION_MESSAGES as NM } from '../../../core/constants/notification-messages';

@Injectable()
export class UsersStore {
  private readonly svc        = inject(UsersService);
  private readonly notify     = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _selected = signal<UserDetailDto | null>(null);
  private readonly _loading  = signal(false);
  private readonly _saving   = signal(false);
  private readonly _error    = signal<string | null>(null);

  readonly selected = this._selected.asReadonly();
  readonly loading  = this._loading.asReadonly();
  readonly saving   = this._saving.asReadonly();
  readonly error    = this._error.asReadonly();
  readonly hasData  = computed(() => this._selected() !== null);

  loadById(id: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.svc.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this._selected.set(res.data);
        this._loading.set(false);
      },
      error: () => {
        this._error.set(NM.INTRANET.USER.NOT_FOUND);
        this._loading.set(false);
        this.notify.error(NM.INTRANET.USER.LOAD_FAILED, 'Intranet');
      },
    });
  }

  updateByEmail(email: string, body: UpdateUserRequest): void {
    this._saving.set(true);
    this.svc.updateByEmail(email, body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this._selected.set(res.data);
        this._saving.set(false);
        this.notify.success(NM.INTRANET.USER.UPDATE_SUCCESS, 'Intranet');
      },
      error: () => {
        this._saving.set(false);
        this.notify.error(NM.INTRANET.USER.UPDATE_FAILED, 'Intranet');
      },
    });
  }

  clearSelected(): void {
    this._selected.set(null);
    this._error.set(null);
  }
}
