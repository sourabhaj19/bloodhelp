import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-shell" style="display:flex;justify-content:center;padding:32px">
      <section class="auth-card" style="max-width:420px;width:100%;border:1px solid #e5e7eb;padding:24px;border-radius:12px">
        <a routerLink="/login">← Back to login</a>
        <h1>Forgot Password</h1>
        <form (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          <label>Email <input [(ngModel)]="email" name="email" type="email" required style="width:100%;padding:8px" /></label>
          <button type="submit" [disabled]="loading" style="background:#b42318;color:white;padding:10px;border:none;border-radius:8px">{{loading ? 'Sending...' : 'Send reset link'}}</button>
          <p *ngIf="message" style="color:#067647">{{message}}</p>
          <p *ngIf="error" style="color:#b42318">{{error}}</p>
        </form>
      </section>
    </main>
  `,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  email = '';
  loading = false;
  message = '';
  error = '';
  async submit() {
    this.loading = true; this.message = ''; this.error = '';
    try {
      const res: any = await this.auth.forgotPassword(this.email);
      this.message = res.message ?? 'If an account exists, a reset link has been sent.';
      if (res.data?.devToken) this.message += ' (dev token: ' + res.data.devToken + ')';
    } catch (e: any) {
      this.error = e?.error?.error?.message ?? 'Failed';
    } finally { this.loading = false; }
  }
}
