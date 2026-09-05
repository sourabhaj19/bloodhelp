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
        <h1 class="page-title">Country codes</h1>
        <p class="page-sub">Dial codes for mobile numbers. Delete is blocked while a code is in use.</p>
      </div>
      <p-button label="Add code" icon="pi pi-plus" (onClick)="openNew()"></p-button>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="All codes" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]">
        <ng-template pTemplate="header">
          <tr><th>Dial code</th><th>Label</th><th>Country</th><th>Status</th><th style="width: 170px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><strong>{{ c.dialCode }}</strong></td>
            <td>{{ c.label }}</td>
            <td>{{ c.country?.name || '—' }}</td>
            <td><p-tag [value]="c.active ? 'Active' : 'Inactive'" [severity]="c.active ? 'success' : 'warning'"></p-tag></td>
            <td>
              <div class="flex gap-2">
                <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="openEdit(c)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="askDelete(c)" pTooltip="Delete"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="text-center muted">No country codes found.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" [header]="editing ? 'Edit country code' : 'Add country code'" [modal]="true" [style]="{ width: 'min(460px, 94vw)' }">
      <div class="flex flex-column gap-3">
        <div class="field mb-0">
          <label for="dial">Dial code</label>
          <input pInputText id="dial" [(ngModel)]="form.dialCode" class="w-full" placeholder="e.g. +91" maxlength="10" />
        </div>
        <div class="field mb-0">
          <label for="label">Label</label>
          <input pInputText id="label" [(ngModel)]="form.label" class="w-full" placeholder="e.g. India (+91)" maxlength="100" />
        </div>
        <div class="field mb-0">
          <label for="country">Country (optional)</label>
            <p-dropdown inputId="country" [(ngModel)]="form.countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="None" [showClear]="true" [filter]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
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
    ` .muted { color: #98a2b3; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } `,
  ],
})
export class MasterCountryCodesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  rows: any[] = [];
  countries: any[] = [];
  loading = true;
  saving = false;
  error = '';
  dialog = false;
  editing: any = null;
  form: any = { dialCode: '', label: '', countryId: '', active: true };

  ngOnInit() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => { this.countries = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/master/country-codes').subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openNew() {
    this.editing = null;
    this.form = { dialCode: '', label: '', countryId: '', active: true };
    this.dialog = true;
  }

  openEdit(c: any) {
    this.editing = c;
    this.form = { dialCode: c.dialCode, label: c.label, countryId: c.countryId || '', active: !!c.active };
    this.dialog = true;
  }

  valid(): boolean {
    return !!(this.form.dialCode?.trim() && this.form.label?.trim());
  }

  payload() {
    const p: any = { dialCode: this.form.dialCode.trim(), label: this.form.label.trim(), active: !!this.form.active };
    if (this.form.countryId) p.countryId = this.form.countryId;
    return p;
  }

  save() {
    this.saving = true;
    const req = this.editing
      ? this.http.patch<any>(`/api/master/country-codes/${this.editing.id}`, this.payload())
      : this.http.post<any>('/api/master/country-codes', this.payload());
    req.subscribe({
      next: () => {
        this.errors.showSuccess(this.editing ? 'Country code updated.' : 'Country code created.');
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

  askDelete(c: any) {
    this.confirm.confirm({
      message: `Delete country code ${c.dialCode}? This is blocked if any user references it.`,
      header: 'Delete code',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/master/country-codes/${c.id}`).subscribe({
          next: () => { this.errors.showSuccess('Country code deleted.'); this.load(); },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
