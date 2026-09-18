import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError, catchError, switchMap, filter, take, from, finalize, timeout, TimeoutError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { LoadingService } from '../services/loading.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);
const REFRESH_FAILED = '__REFRESH_FAILED__';

function isAuthBypassUrl(url: string): boolean {
  // Exact match on auth endpoints (supports relative /api/... and absolute URLs).
  // Forgotten-password / reset / verify 401s must NOT trigger a refresh loop.
  return /\/auth\/(refresh|login|register|forgot-password|reset-password|verify-email)(\?|#|$)/.test(url);
}

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loading = inject(LoadingService);

  const token = auth.accessToken();
  let authReq = req;
  if (token && !req.headers.has('Authorization')) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  const skipLoading = req.headers.has('X-Skip-Loading');
  if (skipLoading) {
    authReq = authReq.clone({ headers: authReq.headers.delete('X-Skip-Loading') });
  } else {
    loading.show();
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthBypassUrl(req.url)) {
        return throwError(() => err);
      }
      if (!isRefreshing) {
        isRefreshing = true;
        refreshSubject.next(null);
        return from(auth.refresh()).pipe(
          switchMap((newToken) => {
            isRefreshing = false;
            if (newToken) {
              refreshSubject.next(newToken);
              const retry = authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
              return next(retry);
            }
            // Refresh returned null (cleared session) — wake waiters with failure marker.
            refreshSubject.next(REFRESH_FAILED);
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => err);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            refreshSubject.next(REFRESH_FAILED);
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          }),
        );
      } else {
        return refreshSubject.pipe(
          filter((t) => t !== null),
          take(1),
          timeout(15000),
          switchMap((newToken) => {
            if (!newToken || newToken === REFRESH_FAILED) {
              return throwError(() => err);
            }
            const retry = authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken!}` } });
            return next(retry);
          }),
          catchError((waitErr) => {
            if (waitErr instanceof TimeoutError) {
              auth.clearSession();
              router.navigate(['/login']);
            }
            return throwError(() => (waitErr instanceof TimeoutError ? err : waitErr));
          }),
        );
      }
    }),
    finalize(() => {
      if (!skipLoading) {
        loading.hide();
      }
    }),
  );
};
