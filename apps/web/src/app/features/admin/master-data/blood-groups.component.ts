import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { MasterDataTabsComponent } from './master-data-tabs.component';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule, MasterDataTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-master-data-tabs />
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">Blood groups</h1>
        <p class="page-sub">Reference data for registration and search. Delete is blocked while a group has donors.</p>
      </div>
      <p-button label="Add group" icon="pi pi-plus" (onClick)="openNew()"></p-button>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="All groups" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]">
        <ng-template pTemplate="header">
          <tr><th>Code</th><th>Label</th><th>Status</th><th style="width: 170px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-b>
          <tr>
            <td><p-tag [value]="b.code" severity="danger"></p-tag></td>
            <td><strong>{{ b.label }}</strong></td>
            <td><p-tag [value]="b.active ? 'Active' : 'Inactive'" [severity]="b.active ? 'success' : 'warning'"></p-tag></td>
            <td>
              <div class="flex gap-2">
                <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="openEdit(b)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="askDelete(b)" pTooltip="Delete"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4" class="text-center muted">No blood groups found.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" [header]="editing ? 'Edit blood group' : 'Add blood group'" [modal]="true" [style]="{ width: 'min(440px, 94vw)' }">
      <div class="flex flex-column gap-3">
        <div class="field mb-0">
          <label for="code">Code</label>
          <input pInputText id="code" [(ngModel)]="form.code" class="w-full" placeholder="e.g. A+" [disabled]="!!editing" maxlength="10" />
          <small *ngIf="editing" class="hint">Code cannot be changed after creation.</small>
        </div>
        <div class="field mb-0">
          <label for="label">Label</label>
          <input pInputText id="label" [(ngModel)]="form.label" class="w-full" placeholder="e.g. A Positive" maxlength="50" />
        </div>
        <div class="flex align-items-center justify-content-between">
          <label for="active" class="font-bold">Active</label>
          <p-inputSwitch inputId="active" [(ngModel)]="form.active"></p-inputSwitch>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="dialog = false"></p-button>
        <p-button [label]="editing ? 'Save' : 'Create'" icon="pi pi-check" (onClick)="save()" [loading]="saving" [disabled]="!valid()"></p-button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    ` .muted { color: #98a2b3; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } .hint { color: #98a2b3; font-size: .78rem; } `,
  ],
})
export class MasterBloodGroupsComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  rows: any[] = [];
  loading = true;
  saving = false;
  error = '';
  dialog = false;
  editing: any = null;
  form: any = { code: '', label: '', active: true };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/master/blood-groups').subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openNew() {
    this.editing = null;
    this.form = { code: '', label: '', active: true };
    this.dialog = true;
  }

  openEdit(b: any) {
    this.editing = b;
    this.form = { code: b.code, label: b.label, active: !!b.active };
    this.dialog = true;
  }

  valid(): boolean {
    return !!(this.form.code?.trim() && this.form.label?.trim());
  }

  save() {
    this.saving = true;
    const req = this.editing
      ? this.http.patch<any>(`/api/master/blood-groups/${this.editing.id}`, {
          label: this.form.label.trim(),
          active: !!this.form.active,
        })
      : this.http.post<any>('/api/master/blood-groups', {
          code: this.form.code.trim(),
          label: this.form.label.trim(),
          active: !!this.form.active,
        });
    req.subscribe({
      next: () => {
        this.errors.showSuccess(this.editing ? 'Blood group updated.' : 'Blood group created.');
        this.dialog = false;
        this.saving = false;
        this.load();
      },
      error: (e) => {
        this.errors.handleHttpError(e, 'Save failed');
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  askDelete(b: any) {
    this.confirm.confirm({
      message: `Delete blood group ${b.code}? This is blocked if any donor uses it.`,
      header: 'Delete group',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/master/blood-groups/${b.id}`).subscribe({
          next: () => { this.errors.showSuccess('Blood group deleted.'); this.load(); },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
