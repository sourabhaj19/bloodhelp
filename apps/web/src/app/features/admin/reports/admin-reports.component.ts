import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SharedUiModule } from '../../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Reports triage</h1>
    <p class="page-sub">Review user reports: OPEN → UNDER_REVIEW → RESOLVED / REJECTED.</p>
    <p-card>
      <p-steps [model]="steps" [activeIndex]="1" [readonly]="true" styleClass="mb-4"></p-steps>
      <div class="grid stagger">
        <div class="col-12 md:col-4">
          <p-card styleClass="h-full text-center">
            <span class="r-icon red"><i class="pi pi-inbox"></i></span>
            <h3 class="mb-1">Open</h3>
            <p class="muted mt-0">New reports waiting for review.</p>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card styleClass="h-full text-center">
            <span class="r-icon amber"><i class="pi pi-eye"></i></span>
            <h3 class="mb-1">Under review</h3>
            <p class="muted mt-0">Someone is investigating these.</p>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card styleClass="h-full text-center">
            <span class="r-icon green"><i class="pi pi-check-circle"></i></span>
            <h3 class="mb-1">Resolved</h3>
            <p class="muted mt-0">Closed as resolved or rejected.</p>
          </p-card>
        </div>
      </div>
      <p-message severity="info" text="The full triage board (assign, comment, resolve) is next on the roadmap. User management is available now." styleClass="w-full mt-3"></p-message>
      <p-button label="Manage users" icon="pi pi-users" severity="secondary" [outlined]="true" routerLink="/admin/users" styleClass="mt-2"></p-button>
    </p-card>
  `,
  styles: [
    `
      .r-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 56px; height: 56px; border-radius: 18px; font-size: 1.5rem;
      }
      .r-icon.red { background: rgba(180,35,24,.1); color: #b42318; }
      .r-icon.amber { background: rgba(245,158,11,.15); color: #b54708; }
      .r-icon.green { background: rgba(16,185,129,.12); color: #067647; }
    `,
  ],
})
export class AdminReportsComponent {
  steps = [{ label: 'Open' }, { label: 'Under review' }, { label: 'Resolved' }];
}
