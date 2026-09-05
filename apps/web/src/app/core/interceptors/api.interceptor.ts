import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError, catchError, switchMap, filter, take, from, finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { LoadingService } from '../services/loading.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

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
      if (err.status !== 401 || req.url.includes('/auth/refresh') || req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
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
              const retry = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
              return next(retry);
            }
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => err);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          }),
        );
      } else {
        return refreshSubject.pipe(
          filter((t) => t !== null),
          take(1),
          switchMap((newToken) => {
            const retry = req.clone({ setHeaders: { Authorization: `Bearer ${newToken!}` } });
            return next(retry);
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
