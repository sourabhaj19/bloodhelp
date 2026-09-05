import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'] as const;

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">Reports triage</h1>
        <p class="page-sub">Review user reports: OPEN → UNDER_REVIEW → RESOLVED / REJECTED.</p>
      </div>
      <p-button label="Refresh" icon="pi pi-refresh" severity="secondary" [outlined]="true" (onClick)="load()"></p-button>
    </div>

    <div class="flex gap-2 mb-3 flex-wrap">
      <p-button
        *ngFor="let s of filterOptions"
        [label]="s.label"
        [severity]="statusFilter === s.value ? undefined : 'secondary'"
        [outlined]="statusFilter !== s.value"
        size="small"
        (onClick)="setFilter(s.value)">
      </p-button>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading && result" header="Reports" [subheader]="result.total + ' total'">
      <p-table [value]="result.items ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Reported user</th><th>Reason</th><th>Reporter</th><th>Status</th><th>Filed</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td><strong>{{ r.reportedUser?.firstName }} {{ r.reportedUser?.lastName }}</strong><div class="muted text-sm">{{ r.reportedUser?.email }}</div></td>
            <td><p-tag [value]="r.reason?.label" severity="warning"></p-tag></td>
            <td>{{ r.reportedBy?.firstName }} {{ r.reportedBy?.lastName }}</td>
            <td><p-tag [value]="pretty(r.status)" [severity]="statusSeverity(r.status)"></p-tag></td>
            <td class="muted text-sm">{{ r.createdAt | date: 'medium' }}</td>
            <td><p-button label="Review" size="small" severity="secondary" [outlined]="true" (onClick)="openDetail(r)"></p-button></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center muted">No reports with this status.</td></tr>
        </ng-template>
      </p-table>
      <div class="flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
        <span class="muted text-sm">Page {{ result.page }} / {{ result.totalPages }} ({{ result.total }} total)</span>
        <div class="flex gap-2">
          <p-button label="Prev" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" size="small" [disabled]="page <= 1" (onClick)="prev()"></p-button>
          <p-button label="Next" icon="pi pi-arrow-right" iconPos="right" severity="secondary" [outlined]="true" size="small" [disabled]="result.page >= result.totalPages" (onClick)="next()"></p-button>
        </div>
      </div>
    </p-card>

    <p-dialog [(visible)]="dialog" header="Review report" [modal]="true" [style]="{ width: 'min(560px, 96vw)' }">
      <div *ngIf="selected" class="flex flex-column gap-3">
        <div class="grid">
          <div class="col-6"><div class="muted text-sm">Reported user</div><strong>{{ selected.reportedUser?.firstName }} {{ selected.reportedUser?.lastName }}</strong><div class="muted text-sm">{{ selected.reportedUser?.email }}</div></div>
          <div class="col-6"><div class="muted text-sm">Reporter</div><strong>{{ selected.reportedBy?.firstName }} {{ selected.reportedBy?.lastName }}</strong><div class="muted text-sm">{{ selected.reportedBy?.email }}</div></div>
          <div class="col-6"><div class="muted text-sm">Reason</div><p-tag [value]="selected.reason?.label" severity="warning"></p-tag></div>
          <div class="col-6"><div class="muted text-sm">Filed</div>{{ selected.createdAt | date: 'medium' }}</div>
          <div class="col-12" *ngIf="selected.description"><div class="muted text-sm">Description</div><p class="mt-1 mb-0">{{ selected.description }}</p></div>
        </div>
        <p-divider></p-divider>
        <div class="field mb-0">
          <label for="status">Status</label>
          <p-dropdown inputId="status" [(ngModel)]="detail.status" [options]="statusOptions" placeholder="Select status" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
        </div>
        <div class="field mb-0">
          <label for="comment">Admin comment (optional)</label>
          <textarea pInputTextarea id="comment" [(ngModel)]="detail.adminComment" rows="3" maxlength="1000" class="w-full" placeholder="Visible in the audit trail; reporter is notified of status changes."></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="dialog = false"></p-button>
        <p-button label="Save decision" icon="pi pi-check" (onClick)="save()" [loading]="saving" [disabled]="!detail.status"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [` .muted { color: #667085; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } `],
})
export class AdminReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);
  private deepLinkHandled = false;

  filterOptions = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Under review', value: 'UNDER_REVIEW' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];
  statusOptions = [...STATUSES];

  statusFilter = '';
  page = 1;
  pageSize = 20;
  result: any = null;
  loading = true;
  error = '';

  dialog = false;
  saving = false;
  selected: any = null;
  detail: any = { status: '', adminComment: '' };

  ngOnInit() { this.load(); }

  setFilter(v: string) {
    this.statusFilter = v;
    this.page = 1;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    let params = new HttpParams()
      .set('page', String(this.page))
      .set('pageSize', String(this.pageSize));
    if (this.statusFilter) params = params.set('status', this.statusFilter);
    this.http.get<any>('/api/admin/reports', { params }).subscribe({
      next: (r) => {
        this.result = r.data ?? r;
        this.loading = false;
        this.cdr.markForCheck();
        // Deep-link: /admin/reports?reportId=xxx (e.g. from a notification)
        if (!this.deepLinkHandled) {
          this.deepLinkHandled = true;
          const targetId = this.route.snapshot.queryParamMap.get('reportId');
          if (targetId) {
            const found = (this.result.items ?? []).find((x: any) => x.id === targetId);
            if (found) this.openDetail(found);
            else this.loadOne(targetId);
          }
        }
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load reports');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  prev() { if (this.page > 1) { this.page--; this.load(); } }
  next() { if (this.result && this.page < this.result.totalPages) { this.page++; this.load(); } }

  pretty(s: string): string {
    return s === 'UNDER_REVIEW' ? 'Under review' : s.charAt(0) + s.slice(1).toLowerCase();
  }

  statusSeverity(s: string): 'danger' | 'warning' | 'success' | 'info' {
    switch (s) {
      case 'OPEN': return 'danger';
      case 'UNDER_REVIEW': return 'warning';
      case 'RESOLVED': return 'success';
      default: return 'info';
    }
  }

  private async loadOne(id: string) {
    try {
      const r: any = await firstValueFrom(this.http.get<any>(`/api/admin/reports/${id}`));
      this.openDetail(r.data ?? r);
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to open report');
    }
  }

  openDetail(r: any) {
    this.selected = r;
    this.detail = { status: r.status, adminComment: r.adminComment || '' };
    this.dialog = true;
    this.cdr.markForCheck();
  }

  save() {
    if (!this.selected || !this.detail.status) return;
    this.saving = true;
    const payload: any = { status: this.detail.status };
    if (this.detail.adminComment?.trim()) payload.adminComment = this.detail.adminComment.trim();
    this.http.patch<any>(`/api/admin/reports/${this.selected.id}`, payload).subscribe({
      next: () => {
        this.errors.showSuccess(`Report marked as ${this.pretty(this.detail.status)}. Reporter notified.`);
        this.dialog = false;
        this.saving = false;
        this.load();
      },
      error: (e) => {
        this.errors.handleHttpError(e, 'Failed to update report');
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
