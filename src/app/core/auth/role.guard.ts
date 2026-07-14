import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { Role } from '../../models/role.enum';

export function roleGuard(allowedRoles: Role[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthStore);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }
    return auth.hasAnyRole(allowedRoles) || router.createUrlTree(['/forbidden']);
  };
}
