import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _accessToken = signal<string | null>(null);
  private _user = signal<AuthUser | null>(null);
  private _initialized = signal(false);
  private initPromise: Promise<void> | null = null;

  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly initialized = this._initialized.asReadonly();

  constructor() {
    // Cross-tab sync: tokens live in memory per tab, cookies are shared.
    // A logout/login in one tab broadcasts so other tabs follow without
    // waiting for their next 401.
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'bloodhelp:logout') {
          this._accessToken.set(null);
          this._user.set(null);
          if (this.isProtectedUrl(this.router.url)) this.router.navigate(['/login']);
        } else if (e.key === 'bloodhelp:login') {
          if (!this._accessToken() && this._initialized()) void this.restoreSession();
        }
      });
    }
  }

  private isProtectedUrl(url: string): boolean {
    return (
      url.startsWith('/dashboard') ||
      url.startsWith('/donors') ||
      url.startsWith('/appreciations') ||
      url.startsWith('/profile') ||
      url.startsWith('/change-password') ||
      url.startsWith('/notifications') ||
      url.startsWith('/reports') ||
      url.startsWith('/admin')
    );
  }

  private broadcast(key: 'bloodhelp:login' | 'bloodhelp:logout'): void {
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* private mode — cross-tab sync best-effort only */
    }
  }

  /** Resolve once the initial session-restore attempt has finished. */
  ensureInitialized(): Promise<void> {
    if (this._initialized()) return Promise.resolve();
    if (!this.initPromise) this.initPromise = this.restoreSession();
    return this.initPromise;
  }

  setSession(token: string, user: AuthUser) {
    this._accessToken.set(token);
    this._user.set(user);
    this._initialized.set(true);
  }

  clearSession() {
    this._accessToken.set(null);
    this._user.set(null);
  }

  async login(identifier: string, password: string, rememberMe = false): Promise<void> {
    const res: any = await firstValueFrom(
      this.http.post(
        '/api/auth/login',
        { identifier, password, rememberMe },
        { withCredentials: true },
      ),
    );
    const data = res.data ?? res;
    this.setSession(data.accessToken, data.user);
    this.broadcast('bloodhelp:login');
  }

  async register(payload: any): Promise<void> {
    const res: any = await firstValueFrom(
      this.http.post('/api/auth/register', payload, { withCredentials: true }),
    );
    const data = res.data ?? res;
    this.setSession(data.accessToken, data.user);
    this.broadcast('bloodhelp:login');
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}, { withCredentials: true }));
    } finally {
      this.clearSession();
      this.broadcast('bloodhelp:logout');
      this.router.navigate(['/login']);
    }
  }

  async refresh(): Promise<string | null> {
    try {
      const res: any = await firstValueFrom(this.http.post('/api/auth/refresh', {}, { withCredentials: true }));
      const data = res.data ?? res;
      this._accessToken.set(data.accessToken);
      if (data.user) this._user.set(data.user);
      return data.accessToken;
    } catch {
      this.clearSession();
      return null;
    }
  }

  async restoreSession(): Promise<void> {
    try {
      const token = await this.refresh();
      if (!token) return;
      const me: any = await firstValueFrom(this.http.get('/api/auth/me', { withCredentials: true }));
      const data = me.data ?? me;
      const u = data;
      this._user.set({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role, email: u.email });
    } catch {
      this.clearSession();
    } finally {
      this._initialized.set(true);
    }
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<string | null> {
    const res: any = await firstValueFrom(
      this.http.post('/api/auth/change-password', { currentPassword, newPassword, confirmPassword }, { withCredentials: true }),
    );
    const data = res.data ?? res;
    // Session was rotated server-side — adopt the fresh access token
    if (data?.accessToken) this._accessToken.set(data.accessToken);
    return data?.accessToken ?? null;
  }

  async verifyEmail(token: string) {
    return firstValueFrom(this.http.post('/api/auth/verify-email', { token }, { withCredentials: true }));
  }

  async resendVerification() {
    return firstValueFrom(this.http.post('/api/auth/resend-verification', {}, { withCredentials: true }));
  }

  async sendMobileOtp(): Promise<any> {
    return firstValueFrom(this.http.post('/api/auth/send-mobile-otp', {}, { withCredentials: true }));
  }

  async verifyMobile(otp: string) {
    return firstValueFrom(this.http.post('/api/auth/verify-mobile', { otp }, { withCredentials: true }));
  }

  async forgotPassword(email: string) {
    return firstValueFrom(this.http.post('/api/auth/forgot-password', { email }, { withCredentials: true }));
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    return firstValueFrom(this.http.post('/api/auth/reset-password', { token, newPassword, confirmPassword }, { withCredentials: true }));
  }
}
