import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../services/notification.service';
import { httpMessage, NOTIFICATION_MESSAGES as NM } from '../constants/notification-messages';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth         = inject(AuthService);
  const router       = inject(Router);
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      switch (err.status) {
        case 401:
          auth.logout();
          notification.error(NM.AUTH.SESSION_EXPIRED);
          break;
        case 403:
          router.navigate(['/forbidden']);
          break;
        default: {
          const serverMessage = err.error?.message ?? err.message;
          notification.error(httpMessage(err.status, serverMessage));
        }
      }
      return throwError(() => err);
    }),
  );
};
