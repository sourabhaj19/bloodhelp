import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SharedUiModule } from '../../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Admin profile</h1>
    <p class="page-sub">Your administrator account.</p>
    <div class="grid">
      <div class="col-12 md:col-6">
        <p-card header="Account">
          <div class="flex align-items-center gap-3">
            <p-avatar icon="pi pi-shield" shape="circle" size="xlarge" styleClass="admin-avatar"></p-avatar>
            <div>
              <div class="font-bold text-xl">Administrator</div>
              <div class="muted">Full platform access</div>
            </div>
          </div>
          <p-divider></p-divider>
          <div class="flex flex-column gap-2">
            <p-button label="Edit my public profile" icon="pi pi-user" routerLink="/profile" styleClass="w-full"></p-button>
            <p-button label="Back to dashboard" icon="pi pi-home" severity="secondary" [outlined]="true" routerLink="/admin/dashboard" styleClass="w-full"></p-button>
          </div>
        </p-card>
      </div>
      <div class="col-12 md:col-6">
        <p-card header="Admin capabilities">
          <div class="flex flex-column gap-2">
            <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Manage users (activate / deactivate / delete)</div>
            <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> View platform analytics</div>
            <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Browse master data tables</div>
            <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Triage user reports</div>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .muted { color: #667085; }
      .ok { color: #067647; }
      :host ::ng-deep .admin-avatar { background: rgba(180,35,24,.12); color: #b42318; }
    `,
  ],
})
export class AdminProfileComponent {}
