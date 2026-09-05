import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
        <div class="text-center mb-4">
          <span class="brand-badge"><i class="pi pi-heart-fill"></i></span>
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-sub">Sign in to your BloodHelp account</p>
        </div>

        <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

        <form (ngSubmit)="login()" #loginForm="ngForm" class="flex flex-column gap-3">
          <div class="field mb-0">
            <label for="identifier">Email or mobile</label>
            <p-iconField iconPosition="left" styleClass="w-full">
              <p-inputIcon styleClass="pi pi-user"></p-inputIcon>
              <input
                pInputText
                id="identifier"
                [(ngModel)]="identifier"
                name="identifier"
                required
                #identifierCtrl="ngModel"
                placeholder="user@example.com or 9876543210"
                autocomplete="username"
                class="w-full"
              />
            </p-iconField>
            <small class="p-error" *ngIf="identifierCtrl.invalid && identifierCtrl.touched">
              Email or mobile is required
            </small>
          </div>

          <div class="field mb-0">
            <label for="password">Password</label>
            <p-password
              [(ngModel)]="password"
              name="password"
              inputId="password"
              required
              #passwordCtrl="ngModel"
              placeholder="Enter your password"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              autocomplete="current-password"
            ></p-password>
            <small class="p-error" *ngIf="passwordCtrl.invalid && passwordCtrl.touched">
              Password is required
            </small>
          </div>

          <div class="flex align-items-center justify-content-between mt-1">
            <div class="flex align-items-center gap-2">
              <p-checkbox [(ngModel)]="rememberMe" name="rememberMe" inputId="rememberMe" [binary]="true"></p-checkbox>
              <label for="rememberMe" class="remember-label">Remember me</label>
            </div>
            <a routerLink="/forgot-password" class="link">Forgot password?</a>
          </div>

          <p-button
            type="submit"
            label="Sign in"
            icon="pi pi-sign-in"
            [loading]="loading"
            [disabled]="loginForm.invalid || loading"
            styleClass="w-full mt-2"
          ></p-button>
        </form>

        <p-divider align="center" styleClass="my-4"><span class="divider-label">New here?</span></p-divider>

        <p class="text-center mt-0">
          Don't have an account?
          <a routerLink="/register" class="link font-bold">Create one</a>
        </p>
        <div class="text-center mt-2">
          <a routerLink="/" class="link back-link"><i class="pi pi-arrow-left mr-1"></i>Back to home</a>
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
        background: rgba(180, 35, 24, 0.1); color: #b42318; font-size: 1.5rem;
      }
      .auth-title { margin: 0.6rem 0 0.15rem; font-size: 1.7rem; letter-spacing: -0.02em; }
      .auth-sub { margin: 0; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .remember-label { font-size: 0.9rem; color: #475467; cursor: pointer; }
      .link { color: #b42318; font-weight: 600; font-size: 0.9rem; }
      .link:hover { text-decoration: underline; }
      .back-link { color: #667085; font-weight: 500; }
      .divider-label { color: #98a2b3; font-size: 0.8rem; font-weight: 600; }
    `,
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private errors = inject(ErrorHandlerService);

  identifier = '';
  password = '';
  rememberMe = false;
  loading = false;
  error = '';

  async login() {
    if (!this.identifier.trim() || !this.password) return;
    this.error = '';
    this.loading = true;
    try {
      await this.auth.login(this.identifier.trim(), this.password, this.rememberMe);
      this.errors.showSuccess('Welcome back!', 'Login successful');
      const user = this.auth.user();
      if (user?.role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
      else this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.error = this.errors.getUserMessage(e);
      this.errors.handleHttpError(e as any, 'Login failed');
    } finally {
      this.loading = false;
    }
  }
}
