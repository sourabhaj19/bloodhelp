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
        <h1 class="page-title">Countries</h1>
        <p class="page-sub">Address hierarchy root. Delete is blocked while states or users reference a country.</p>
      </div>
      <p-button label="Add country" icon="pi pi-plus" (onClick)="openNew()"></p-button>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="All countries" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>ISO-2</th><th>Status</th><th style="width: 170px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><i class="pi pi-globe mr-2 muted"></i><strong>{{ c.name }}</strong></td>
            <td><p-tag [value]="c.isoCode2" severity="info"></p-tag></td>
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
          <tr><td colspan="4" class="text-center muted">No countries found.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" [header]="editing ? 'Edit country' : 'Add country'" [modal]="true" [style]="{ width: 'min(440px, 94vw)' }">
      <div class="flex flex-column gap-3">
        <div class="field mb-0">
          <label for="name">Name</label>
          <input pInputText id="name" [(ngModel)]="form.name" class="w-full" placeholder="e.g. India" maxlength="100" />
        </div>
        <div class="field mb-0">
          <label for="iso">ISO code (2 letters)</label>
          <input pInputText id="iso" [(ngModel)]="form.isoCode2" class="w-full uppercase" placeholder="e.g. IN" maxlength="2" />
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
    ` .muted { color: #98a2b3; } .uppercase { text-transform: uppercase; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } `,
  ],
})
export class MasterCountriesComponent implements OnInit {
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
  form: any = { name: '', isoCode2: '', active: true };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openNew() {
    this.editing = null;
    this.form = { name: '', isoCode2: '', active: true };
    this.dialog = true;
  }

  openEdit(c: any) {
    this.editing = c;
    this.form = { name: c.name, isoCode2: c.isoCode2, active: !!c.active };
    this.dialog = true;
  }

  valid(): boolean {
    return !!(this.form.name?.trim() && /^[A-Za-z]{2}$/.test((this.form.isoCode2 || '').trim()));
  }

  payload() {
    return { name: this.form.name.trim(), isoCode2: this.form.isoCode2.trim().toUpperCase(), active: !!this.form.active };
  }

  save() {
    this.saving = true;
    const req = this.editing
      ? this.http.patch<any>(`/api/master/countries/${this.editing.id}`, this.payload())
      : this.http.post<any>('/api/master/countries', this.payload());
    req.subscribe({
      next: () => {
        this.errors.showSuccess(this.editing ? 'Country updated.' : 'Country created.');
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
      message: `Delete ${c.name}? This is blocked if it has states or users.`,
      header: 'Delete country',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/master/countries/${c.id}`).subscribe({
          next: () => { this.errors.showSuccess('Country deleted.'); this.load(); },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
