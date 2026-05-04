import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly msg = inject(MessageService);

  success(message: string, title = 'Success'): void {
    this.msg.add({ severity: 'success', summary: title, detail: message, life: 4000 });
  }

  error(message: string, title = 'Error'): void {
    this.msg.add({ severity: 'error', summary: title, detail: message, life: 6000 });
  }

  warning(message: string, title = 'Warning'): void {
    // PrimeNG uses 'warn' internally but accepts 'warning' in v21
    this.msg.add({ severity: 'warn', summary: title, detail: message, life: 5000 });
  }

  info(message: string, title = 'Info'): void {
    this.msg.add({ severity: 'info', summary: title, detail: message, life: 4000 });
  }

  /** Dismisses all active toasts. */
  clear(): void {
    this.msg.clear();
  }
}
