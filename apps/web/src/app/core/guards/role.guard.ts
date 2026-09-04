import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowed: Array<'USER' | 'ADMIN'>): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();
    if (user && allowed.includes(user.role)) return true;
    // Per §8: non-admins redirected to /dashboard with a toast (toast wiring in Phase 4)
    router.navigate(['/dashboard']);
    return false;
  };
}
