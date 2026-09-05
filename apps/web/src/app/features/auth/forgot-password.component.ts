import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
          <span class="brand-badge"><i class="pi pi-lock"></i></span>
          <h1 class="auth-title">Forgot password?</h1>
          <p class="auth-sub">Enter your email and we'll send you a reset link.</p>
        </div>
        <p-message *ngIf="message" severity="success" [text]="message" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
        <form (ngSubmit)="submit()" #f="ngForm" class="flex flex-column gap-3">
          <div class="field mb-0">
            <label for="email">Email</label>
            <p-iconField iconPosition="left" styleClass="w-full">
              <p-inputIcon styleClass="pi pi-envelope"></p-inputIcon>
              <input pInputText id="email" [(ngModel)]="email" name="email" type="email" required email placeholder="user@example.com" class="w-full" />
            </p-iconField>
          </div>
          <p-button type="submit" label="Send reset link" icon="pi pi-send" [loading]="loading" [disabled]="f.invalid || loading" styleClass="w-full"></p-button>
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
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private errors = inject(ErrorHandlerService);
  email = '';
  loading = false;
  message = '';
  error = '';

  async submit() {
    this.loading = true;
    this.message = '';
    this.error = '';
    try {
      const res: any = await this.auth.forgotPassword(this.email.trim());
      this.message = res.message ?? 'If an account exists, a reset link has been sent.';
      if (res.data?.devToken) this.message += ' (dev token: ' + res.data.devToken + ')';
    } catch (e: any) {
      this.error = this.errors.getUserMessage(e);
      this.errors.handleHttpError(e, 'Failed to send reset link');
    } finally {
      this.loading = false;
    }
  }
}
