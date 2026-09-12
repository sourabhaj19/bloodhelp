import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto" style="max-width: 560px">
      <h1 class="page-title">Change password</h1>
      <p class="page-sub">Changing your password logs out all other devices. <a routerLink="/profile" class="link">Back to profile</a></p>

      <p-card header="Security">
        <p-message *ngIf="pwError" severity="error" [text]="pwError" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="pwMismatch" severity="warn" text="New passwords do not match." styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="done" severity="success" text="Password changed. All other devices were logged out." styleClass="w-full mb-3"></p-message>
        <form (ngSubmit)="changePassword()" #pwForm="ngForm" class="flex flex-column gap-3">
          <div class="field mb-0">
            <label for="cur">Current password</label>
            <p-password [(ngModel)]="pw.current" name="current" inputId="cur" required [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" autocomplete="current-password"></p-password>
          </div>
          <div class="field mb-0">
            <label for="npw">New password</label>
            <p-password [(ngModel)]="pw.next" name="next" inputId="npw" required minlength="8" maxlength="128" pattern="^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password"></p-password>
            <small class="hint">8+ characters with one uppercase &amp; one special character.</small>
          </div>
          <div class="field mb-0">
            <label for="cpw">Confirm new password</label>
            <p-password [(ngModel)]="pw.confirm" name="confirm" inputId="cpw" required [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password"></p-password>
          </div>
          <div>
            <p-button type="submit" label="Change password" icon="pi pi-key" [loading]="pwSaving" [disabled]="pwForm.invalid || pwSaving"></p-button>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .link { color: #b42318; font-weight: 600; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .hint { color: #98a2b3; }
    `,
  ],
})
export class ChangePasswordComponent {
  private auth = inject(AuthService);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  pw = { current: '', next: '', confirm: '' };
  pwSaving = false;
  pwError = '';
  pwMismatch = false;
  done = false;

  async changePassword() {
    this.pwError = '';
    this.done = false;
    this.pwMismatch = this.pw.next !== this.pw.confirm;
    if (this.pwMismatch || !this.pw.current || !this.pw.next) return;
    this.pwSaving = true;
    try {
      await this.auth.changePassword(this.pw.current, this.pw.next, this.pw.confirm);
      this.pw = { current: '', next: '', confirm: '' };
      this.done = true;
      this.errors.showSuccess('Password changed. All other devices were logged out.');
    } catch (e: any) {
      this.pwError = this.errors.getUserMessage(e);
      this.errors.handleHttpError(e, 'Password change failed');
    } finally {
      this.pwSaving = false;
      this.cdr.markForCheck();
    }
  }
}
