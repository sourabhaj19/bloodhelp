import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">Admin dashboard</h1>
        <p class="page-sub">Platform health at a glance.</p>
      </div>
      <div class="flex gap-2">
        <p-button label="Users" icon="pi pi-users" severity="secondary" [outlined]="true" routerLink="/admin/users"></p-button>
        <p-button label="Refresh" icon="pi pi-refresh" [outlined]="true" (onClick)="load()"></p-button>
      </div>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <div *ngIf="loading" class="grid">
      <div class="col-12 sm:col-6 lg:col-3" *ngFor="let i of [1, 2, 3, 4]">
        <p-skeleton height="7rem" borderRadius="16px"></p-skeleton>
      </div>
    </div>

    <div *ngIf="data && !loading" class="grid stagger">
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat"><div class="stat-label">Total users</div><div class="stat-value">{{ data.totals.totalUsers }}</div><div class="stat-hint">Registered accounts</div></p-card>
      </div>
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat"><div class="stat-label">Active users</div><div class="stat-value ok">{{ data.totals.activeUsers }}</div><div class="stat-hint">Visible in search</div></p-card>
      </div>
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat"><div class="stat-label">Open reports</div><div class="stat-value warn">{{ data.totals.totalReportsOpen }}</div><div class="stat-hint">Needs triage</div></p-card>
      </div>
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat"><div class="stat-label">Total reports</div><div class="stat-value">{{ data.totals.totalReports }}</div><div class="stat-hint">All time</div></p-card>
      </div>

      <div class="col-12 lg:col-5">
        <p-card header="Donors by blood group">
          <p-table [value]="data.bloodGroupBreakdown ?? []" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Group</th><th class="text-right">Donors</th></tr></ng-template>
            <ng-template pTemplate="body" let-bg>
              <tr><td><p-tag [value]="bg.bloodGroupCode" severity="danger"></p-tag></td><td class="text-right font-bold">{{ bg.count }}</td></tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="2" class="text-center muted">No data yet.</td></tr></ng-template>
          </p-table>
        </p-card>
      </div>
      <div class="col-12 lg:col-7">
        <p-card header="Recent users">
          <p-table [value]="data.recentUsers ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header"><tr><th>Name</th><th>Email</th><th>Joined</th></tr></ng-template>
            <ng-template pTemplate="body" let-u>
              <tr><td><strong>{{ u.firstName }} {{ u.lastName }}</strong></td><td>{{ u.email }}</td><td class="muted">{{ u.createdAt | date }}</td></tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center muted">No recent users.</td></tr></ng-template>
          </p-table>
          <p-button label="Manage all users" icon="pi pi-arrow-right" iconPos="right" severity="secondary" [outlined]="true" routerLink="/admin/users" size="small" styleClass="mt-3"></p-button>
        </p-card>
      </div>

      <div class="col-12">
        <p-card header="Master data" subheader="Reference tables used across the platform">
          <div class="flex flex-wrap gap-2">
            <p-button label="Blood groups" icon="pi pi-heart" severity="secondary" [outlined]="true" size="small" routerLink="/admin/master-data/blood-groups"></p-button>
            <p-button label="Country codes" icon="pi pi-phone" severity="secondary" [outlined]="true" size="small" routerLink="/admin/master-data/country-codes"></p-button>
            <p-button label="Countries" icon="pi pi-globe" severity="secondary" [outlined]="true" size="small" routerLink="/admin/master-data/countries"></p-button>
            <p-button label="States" icon="pi pi-map" severity="secondary" [outlined]="true" size="small" routerLink="/admin/master-data/states"></p-button>
            <p-button label="Cities" icon="pi pi-building" severity="secondary" [outlined]="true" size="small" routerLink="/admin/master-data/cities"></p-button>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .stat-label { color: #667085; font-size: 0.85rem; font-weight: 600; }
      .stat-value { font-size: 2rem; font-weight: 800; margin-top: 0.2rem; }
      .stat-value.ok { color: #067647; }
      .stat-value.warn { color: #b54708; }
      .stat-hint { color: #98a2b3; font-size: 0.82rem; }
      .muted { color: #98a2b3; }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  data: any = null;
  loading = true;
  error = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/admin/dashboard').subscribe({
      next: (r) => { this.data = r.data ?? r; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load admin dashboard');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
