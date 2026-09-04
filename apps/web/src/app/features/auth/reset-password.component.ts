import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-shell" style="display:flex;justify-content:center;padding:32px">
      <section class="auth-card" style="max-width:420px;width:100%;border:1px solid #e5e7eb;padding:24px;border-radius:12px">
        <a routerLink="/login">← Back</a>
        <h1>Reset Password</h1>
        <form (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
          <label>Token (from email link)
            <input [(ngModel)]="token" name="token" required style="width:100%;padding:8px" />
          </label>
          <label>New Password <input [(ngModel)]="newPassword" name="newPassword" type="password" required style="width:100%;padding:8px" /></label>
          <label>Confirm Password <input [(ngModel)]="confirmPassword" name="confirmPassword" type="password" required style="width:100%;padding:8px" /></label>
          <button type="submit" [disabled]="loading" style="background:#b42318;color:white;padding:10px;border:none;border-radius:8px">{{loading ? 'Resetting...' : 'Reset password'}}</button>
          <p *ngIf="message" style="color:#067647">{{message}}</p>
          <p *ngIf="error" style="color:#b42318">{{error}}</p>
        </form>
      </section>
    </main>
  `,
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  message = '';
  error = '';
  async submit() {
    this.loading = true; this.error=''; this.message='';
    try {
      await this.auth.resetPassword(this.token, this.newPassword, this.confirmPassword);
      this.message = 'Password reset successful — redirecting to login';
      setTimeout(()=> this.router.navigate(['/login']), 1200);
    } catch(e:any){ this.error = e?.error?.error?.message ?? 'Reset failed'; }
    finally{ this.loading=false; }
  }
}
