import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { UiStore } from '../../store/ui/ui.store';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const uiStore = inject(UiStore);
  uiStore.startLoading();
  return next(req).pipe(finalize(() => uiStore.stopLoading()));
};
