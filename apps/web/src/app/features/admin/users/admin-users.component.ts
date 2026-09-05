import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Users</h1>
    <p class="page-sub">Manage donor and admin accounts.</p>

    <p-card styleClass="mb-3">
      <div class="flex gap-2">
        <p-iconField iconPosition="left" styleClass="w-full">
          <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
          <input pInputText [(ngModel)]="search" placeholder="Search email / name / mobile" class="w-full" (keyup.enter)="load()" />
        </p-iconField>
        <p-button label="Search" icon="pi pi-search" (onClick)="load()" [loading]="loading"></p-button>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading users…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading && result" header="Results" [subheader]="result.total + ' user(s)'">
      <p-table [value]="result.items ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th style="width: 220px">Actions</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-u>
          <tr>
            <td><strong>{{ u.firstName }} {{ u.lastName }}</strong></td>
            <td>{{ u.email }}</td>
            <td><p-tag [value]="u.role" [severity]="u.role === 'ADMIN' ? 'danger' : 'info'"></p-tag></td>
            <td><p-tag [value]="u.active ? 'Active' : 'Inactive'" [severity]="u.active ? 'success' : 'warning'"></p-tag></td>
            <td>
              <div class="flex gap-2">
                <p-button [label]="u.active ? 'Deactivate' : 'Activate'" size="small" severity="secondary" [outlined]="true" (onClick)="toggle(u)"></p-button>
                <p-button label="Delete" size="small" severity="danger" [outlined]="true" (onClick)="askRemove(u)"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="text-center muted">No users found.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .muted { color: #98a2b3; }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  search = '';
  loading = false;
  error = '';
  result: any = null;

  ngOnInit() { this.load(); }

  load() {
    let params = new HttpParams().set('page', '1').set('pageSize', '20');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/admin/users', { params }).subscribe({
      next: (r) => { this.result = r.data ?? r; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load users');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggle(u: any) {
    this.http.patch<any>(`/api/admin/users/${u.id}/status`, { active: !u.active }).subscribe({
      next: () => {
        this.errors.showSuccess(`User ${!u.active ? 'activated' : 'deactivated'}.`);
        this.load();
      },
      error: (e) => this.errors.handleHttpError(e, 'Status update failed'),
    });
  }

  askRemove(u: any) {
    this.confirm.confirm({
      message: `Soft-delete user ${u.email}? They will be hidden from search.`,
      header: 'Delete user',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/admin/users/${u.id}`).subscribe({
          next: () => {
            this.errors.showSuccess('User deleted.');
            this.load();
          },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
