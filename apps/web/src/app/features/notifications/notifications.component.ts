import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-sub">Donation requests, thanks, and account updates.</p>
      </div>
      <p-button label="Mark all read" icon="pi pi-check" severity="secondary" [outlined]="true" (onClick)="markAll()" [disabled]="!items.length"></p-button>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="4rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <div *ngIf="!loading" class="flex flex-column gap-2">
      <p-card *ngFor="let n of items" [styleClass]="(n.isRead ? 'read' : 'unread') + (hasReport(n) ? ' clickable' : '')">
        <div class="flex align-items-start justify-content-between gap-2">
          <div [class.linkable]="hasReport(n)" (click)="openLinked(n)" [style.cursor]="hasReport(n) ? 'pointer' : 'default'">
            <div class="flex align-items-center gap-2">
              <strong>{{ n.title }}</strong>
              <p-tag *ngIf="!n.isRead" value="New" severity="danger"></p-tag>
              <p-tag *ngIf="hasReport(n)" value="View report" severity="info"></p-tag>
            </div>
            <div class="muted text-sm">{{ n.createdAt | date: 'medium' }}</div>
            <p class="mt-2 mb-0">{{ n.message }}</p>
          </div>
          <p-button *ngIf="!n.isRead" label="Mark read" size="small" severity="secondary" [outlined]="true" (onClick)="mark(n)"></p-button>
        </div>
      </p-card>
      <p-card *ngIf="!items.length">
        <p class="text-center muted">You're all caught up. No notifications.</p>
      </p-card>
      <p-paginator
        *ngIf="total > pageSize"
        [rows]="pageSize"
        [totalRecords]="total"
        [rowsPerPageOptions]="[10, 20, 50]"
        [first]="(page - 1) * pageSize"
        (onPageChange)="onPage($event)"
        styleClass="mt-2">
      </p-paginator>
    </div>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 0; color: #667085; }
      .muted { color: #667085; }
      :host ::ng-deep .unread { border-left: 4px solid #b42318; }
      :host ::ng-deep .read { opacity: 0.85; }
      :host ::ng-deep .clickable:hover { box-shadow: 0 4px 8px rgba(16, 24, 40, 0.08), 0 12px 28px -6px rgba(180, 35, 24, 0.18); }
      .linkable:hover strong { color: #b42318; }
    `,
  ],
})
export class NotificationsComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  items: any[] = [];
  loading = true;
  error = '';
  page = 1;
  pageSize = 20;
  total = 0;

  ngOnInit() { this.load(); }

  onPage(e: any) {
    this.page = e.page + 1;
    this.pageSize = e.rows;
    this.load();
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();
    const params = { page: String(this.page), pageSize: String(this.pageSize) };
    this.http.get<any>('/api/notifications', { params }).subscribe({
      next: (r) => {
        const d = r.data ?? r;
        this.items = d.items ?? (Array.isArray(d) ? d : []);
        this.total = d.total ?? this.items.length;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load notifications');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  hasReport(n: any): boolean {
    return n?.referenceType === 'REPORT' && !!n?.referenceId;
  }

  /** Report notifications deep-link to the report brief (marks the notification read). */
  openLinked(n: any) {
    if (!this.hasReport(n)) return;
    if (!n.isRead) this.mark(n);
    const reportId = n.referenceId;
    if (this.auth.isAdmin()) this.router.navigate(['/admin/reports'], { queryParams: { reportId } });
    else this.router.navigate(['/reports'], { queryParams: { reportId } });
  }

  mark(n: any) {
    this.http.patch<any>(`/api/notifications/${n.id}/read`, {}).subscribe({
      next: () => { n.isRead = true; this.cdr.markForCheck(); },
      error: (e) => this.errors.handleHttpError(e, 'Failed to mark as read'),
    });
  }

  markAll() {
    this.http.patch<any>(`/api/notifications/read-all`, {}).subscribe({
      next: () => {
        this.errors.showSuccess('All notifications marked as read.');
        this.load();
      },
      error: (e) => this.errors.handleHttpError(e, 'Failed to mark all as read'),
    });
  }
}
