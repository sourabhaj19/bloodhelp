import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-shell" style="display:flex;justify-content:center;padding:32px">
      <section class="auth-card" style="max-width:420px;width:100%;border:1px solid #e5e7eb;padding:24px;border-radius:12px">
        <a routerLink="/">← Back</a>
        <h1>Login</h1>
        <form (ngSubmit)="login()" style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          <label> Email or Mobile
            <input [(ngModel)]="identifier" name="identifier" required style="width:100%;padding:8px" placeholder="user@example.com or 9876543210 or +919876543210" />
          </label>
          <label> Password
            <input [(ngModel)]="password" name="password" type="password" required style="width:100%;padding:8px" />
          </label>
          <button type="submit" [disabled]="loading" style="background:#b42318;color:white;padding:10px;border:none;border-radius:8px">{{loading ? 'Signing in...' : 'Login'}}</button>
          <p *ngIf="error" style="color:#b42318">{{error}}</p>
        </form>
        <p style="margin-top:12px"><a routerLink="/forgot-password">Forgot password?</a> · <a routerLink="/register">Create account</a></p>
      </section>
    </main>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  identifier = '';
  password = '';
  loading = false;
  error = '';

  async login() {
    this.error = '';
    this.loading = true;
    try {
      await this.auth.login(this.identifier.trim(), this.password);
      const user = this.auth.user();
      if (user?.role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
      else this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = e?.error?.error?.message ?? e?.error?.message ?? 'Login failed — check credentials';
    } finally {
      this.loading = false;
    }
  }
}
