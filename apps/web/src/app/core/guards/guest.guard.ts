import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Reverse guard per §8 — prevents logged-in users from visiting /login, /register, etc.
 * Respects a safe returnUrl; falls back by role: ADMIN -> /admin/dashboard, USER -> /dashboard
 */
export const guestGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureInitialized();
  if (!auth.isAuthenticated()) return true;
  const user = auth.user();
  const requested = String(route.queryParams?.['returnUrl'] ?? '');
  if (isSafeReturnUrl(requested, user?.role)) {
    router.navigateByUrl(requested);
  } else if (user?.role === 'ADMIN') {
    router.navigate(['/admin/dashboard']);
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};

function isSafeReturnUrl(url: string, role?: string): boolean {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return false;
  const blocked = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  if (blocked.some((p) => url === p || url.startsWith(p + '?') || url.startsWith(p + '/'))) return false;
  if (url.startsWith('/admin') && role !== 'ADMIN') return false;
  return true;
}
