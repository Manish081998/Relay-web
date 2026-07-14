import { Injectable, signal, computed } from '@angular/core';

/**
 * Signal-based UI store — owns layout/global-loading state.
 *
 * Pattern is intentionally compatible with @ngrx/signals so that
 * `signalStore()` can be dropped in with minimal refactor when
 * complexity justifies the NgRx dependency.
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  // --- state ---
  private readonly _sidebarCollapsed = signal(false);
  private readonly _loadingCount     = signal(0);

  // --- selectors ---
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly isLoading        = computed(() => this._loadingCount() > 0);

  // --- actions ---
  toggleSidebar(): void {
    this._sidebarCollapsed.update(v => !v);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this._sidebarCollapsed.set(collapsed);
  }

  /** Call startLoading/stopLoading in pairs — supports concurrent loaders. */
  startLoading(): void {
    this._loadingCount.update(n => n + 1);
  }

  stopLoading(): void {
    this._loadingCount.update(n => Math.max(0, n - 1));
  }
}
