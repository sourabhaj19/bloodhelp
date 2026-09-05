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

  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  setSession(token: string, user: AuthUser) {
    this._accessToken.set(token);
    this._user.set(user);
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
  }

  async register(payload: any): Promise<void> {
    const res: any = await firstValueFrom(
      this.http.post('/api/auth/register', payload, { withCredentials: true }),
    );
    const data = res.data ?? res;
    this.setSession(data.accessToken, data.user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}, { withCredentials: true }));
    } finally {
      this.clearSession();
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
