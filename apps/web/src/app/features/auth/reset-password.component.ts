import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-shell">
      <p-card styleClass="auth-card-ui">
        <div class="text-center mb-3">
          <span class="brand-badge"><i class="pi pi-key"></i></span>
          <h1 class="auth-title">Set a new password</h1>
          <p class="auth-sub">Paste the token from your email link, then choose a new password.</p>
        </div>
        <p-message *ngIf="message" severity="success" [text]="message" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="mismatch" severity="warn" text="Passwords do not match." styleClass="w-full mb-3"></p-message>
        <form (ngSubmit)="submit()" #f="ngForm" class="flex flex-column gap-3">
          <div class="field mb-0">
            <label for="token">Reset token</label>
            <input pInputText id="token" [(ngModel)]="token" name="token" required class="w-full" placeholder="Token from email" />
          </div>
          <div class="field mb-0">
            <label for="np">New password</label>
            <p-password [(ngModel)]="newPassword" name="newPassword" inputId="np" required minlength="8" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Min. 8 characters"></p-password>
          </div>
          <div class="field mb-0">
            <label for="cp">Confirm password</label>
            <p-password [(ngModel)]="confirmPassword" name="confirmPassword" inputId="cp" required [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" placeholder="Repeat password"></p-password>
          </div>
          <p-button type="submit" label="Reset password" icon="pi pi-check" [loading]="loading" [disabled]="f.invalid || loading" styleClass="w-full"></p-button>
        </form>
        <div class="text-center mt-3">
          <a routerLink="/login" class="link"><i class="pi pi-arrow-left mr-1"></i>Back to login</a>
        </div>
      </p-card>
    </main>
  `,
  styles: [
    `
      .auth-card-ui { width: min(440px, 94vw); }
      :host ::ng-deep .auth-card-ui { border-radius: 18px; }
      :host ::ng-deep .auth-card-ui .p-card-body { padding: 1.75rem; }
      .brand-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 52px; height: 52px; border-radius: 16px;
        background: rgba(180, 35, 24, 0.1); color: #b42318; font-size: 1.4rem;
      }
      .auth-title { margin: 0.6rem 0 0.15rem; font-size: 1.6rem; }
      .auth-sub { margin: 0; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .link { color: #b42318; font-weight: 600; font-size: 0.9rem; }
    `,
  ],
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private errors = inject(ErrorHandlerService);

  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  message = '';
  error = '';
  mismatch = false;

  async submit() {
    this.error = '';
    this.message = '';
    this.mismatch = this.newPassword !== this.confirmPassword;
    if (this.mismatch) return;
    this.loading = true;
    try {
      await this.auth.resetPassword(this.token.trim(), this.newPassword, this.confirmPassword);
      this.message = 'Password reset successful — redirecting to login…';
      this.errors.showSuccess('Your password has been reset. Please log in.');
      setTimeout(() => this.router.navigate(['/login']), 1200);
    } catch (e: any) {
      this.error = this.errors.getUserMessage(e);
      this.errors.handleHttpError(e, 'Reset failed');
    } finally {
      this.loading = false;
    }
  }
}
