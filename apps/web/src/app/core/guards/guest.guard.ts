import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Reverse guard per §8 — prevents logged-in users from visiting /login, /register, etc.
 * Redirects by role: ADMIN -> /admin/dashboard, USER -> /dashboard
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  const user = auth.user();
  if (user?.role === 'ADMIN') {
    router.navigate(['/admin/dashboard']);
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};
