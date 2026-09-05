import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
        <div class="text-center" *ngIf="loading">
          <p-progressSpinner styleClass="w-3rem h-3rem"></p-progressSpinner>
          <h1 class="auth-title">Verifying your email…</h1>
          <p class="auth-sub">One moment.</p>
        </div>

        <div class="text-center" *ngIf="!loading && ok">
          <span class="brand-badge ok"><i class="pi pi-check"></i></span>
          <h1 class="auth-title">Email verified!</h1>
          <p class="auth-sub">Your address is confirmed. A welcome email is on its way — please log in to continue.</p>
          <p-button label="Go to login" icon="pi pi-sign-in" routerLink="/login" styleClass="w-full mt-3"></p-button>
        </div>

        <div class="text-center" *ngIf="!loading && !ok">
          <span class="brand-badge bad"><i class="pi pi-times"></i></span>
          <h1 class="auth-title">Link didn't work</h1>
          <p class="auth-sub">{{ error || 'This verification link is invalid or has expired.' }}</p>
          <p class="hint mt-2">Log in, then request a fresh link from your Profile page.</p>
          <div class="flex gap-2 justify-content-center mt-3">
            <p-button label="Log in" icon="pi pi-sign-in" routerLink="/login"></p-button>
            <p-button label="Back home" severity="secondary" [outlined]="true" routerLink="/"></p-button>
          </div>
        </div>
      </p-card>
    </main>
  `,
  styles: [
    `
      .auth-card-ui { width: min(440px, 94vw); }
      :host ::ng-deep .auth-card-ui { border-radius: 18px; }
      :host ::ng-deep .auth-card-ui .p-card-body { padding: 2rem 1.75rem; text-align: center; }
      .brand-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 60px; height: 60px; border-radius: 20px; font-size: 1.7rem;
        background: rgba(180, 35, 24, 0.1); color: #b42318;
      }
      .brand-badge.ok { background: rgba(16, 185, 129, 0.12); color: #067647; }
      .brand-badge.bad { background: rgba(180, 35, 24, 0.1); color: #b42318; }
      .auth-title { margin: 0.8rem 0 0.3rem; font-size: 1.6rem; }
      .auth-sub { margin: 0; color: #667085; }
      .hint { color: #98a2b3; font-size: 0.85rem; }
    `,
  ],
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  ok = false;
  error = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.loading = false;
      this.error = 'No verification token found in this link.';
      this.cdr.markForCheck();
      return;
    }
    this.auth.verifyEmail(token).then(
      () => {
        this.ok = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
      (e: unknown) => {
        this.error = this.errors.getUserMessage(e);
        this.loading = false;
        this.cdr.markForCheck();
      },
    );
  }
}
