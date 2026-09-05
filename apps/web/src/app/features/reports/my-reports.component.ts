import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">My reports</h1>
    <p class="page-sub">Reports you've filed. Admins review each one and you'll be notified of status changes.</p>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="Filed reports" [subheader]="rows.length + ' total'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Reported user</th><th>Reason</th><th>Status</th><th>Filed</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td><strong>{{ r.reportedUser?.firstName }} {{ r.reportedUser?.lastName }}</strong></td>
            <td><p-tag [value]="r.reason?.label" severity="warning"></p-tag></td>
            <td><p-tag [value]="pretty(r.status)" [severity]="statusSeverity(r.status)"></p-tag></td>
            <td class="muted text-sm">{{ r.createdAt | date: 'medium' }}</td>
            <td><p-button label="View" size="small" severity="secondary" [outlined]="true" (onClick)="openDetail(r)"></p-button></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="text-center muted">You haven't filed any reports.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" header="Report brief" [modal]="true" [style]="{ width: 'min(480px, 94vw)' }">
      <div *ngIf="selected" class="flex flex-column gap-3">
        <div class="flex align-items-center justify-content-between">
          <p-tag [value]="pretty(selected.status)" [severity]="statusSeverity(selected.status)"></p-tag>
          <span class="muted text-sm">{{ selected.createdAt | date: 'medium' }}</span>
        </div>
        <div>
          <div class="muted text-sm">Reported user</div>
          <strong>{{ selected.reportedUser?.firstName }} {{ selected.reportedUser?.lastName }}</strong>
        </div>
        <div>
          <div class="muted text-sm">Reason</div>
          <p-tag [value]="selected.reason?.label" severity="warning"></p-tag>
        </div>
        <div *ngIf="selected.description">
          <div class="muted text-sm">Your description</div>
          <p class="mt-1 mb-0">{{ selected.description }}</p>
        </div>
        <p-message severity="info" text="An admin will review this report. You'll get a notification when its status changes." styleClass="w-full"></p-message>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Close" (onClick)="dialog = false"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [` .muted { color: #667085; } `],
})
export class MyReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  rows: any[] = [];
  loading = true;
  error = '';
  dialog = false;
  selected: any = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/reports/mine').subscribe({
      next: (r) => {
        this.rows = r.data ?? r ?? [];
        this.loading = false;
        this.cdr.markForCheck();
        // Deep-link: /reports?reportId=xxx (e.g. from a notification)
        const targetId = this.route.snapshot.queryParamMap.get('reportId');
        if (targetId) {
          const found = this.rows.find((x) => x.id === targetId);
          if (found) this.openDetail(found);
          else this.loadOne(targetId);
        }
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load your reports');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private async loadOne(id: string) {
    try {
      const r: any = await firstValueFrom(this.http.get<any>(`/api/reports/${id}`));
      this.openDetail(r.data ?? r);
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to open report');
    }
  }

  openDetail(r: any) {
    this.selected = r;
    this.dialog = true;
    this.cdr.markForCheck();
  }

  pretty(s: string): string {
    if (!s) return '—';
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
}
