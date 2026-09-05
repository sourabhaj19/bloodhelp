import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ProfileComponent } from '../../profile/profile.component';

/** Admin's own profile — rendered INSIDE the admin shell so the admin menu stays visible. */
@Component({
  standalone: true,
  imports: [SharedUiModule, ProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-profile-editor />

    <p-card header="Admin capabilities" styleClass="mt-3 mx-auto" [style]="{ 'max-width': '720px' }">
      <div class="flex flex-column gap-2">
        <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Manage users (activate / deactivate / delete)</div>
        <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> View platform analytics</div>
        <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Full master-data CRUD</div>
        <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Triage user reports</div>
      </div>
    </p-card>
  `,
  styles: [` .ok { color: #067647; } `],
})
export class AdminProfileComponent {}
