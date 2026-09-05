import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { MasterDataTabsComponent } from './master-data-tabs.component';

@Component({
  standalone: true,
  imports: [SharedUiModule, MasterDataTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-master-data-tabs />
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">States</h1>
        <p class="page-sub">All states by default — filter by country. Delete is blocked while cities or users reference a state.</p>
      </div>
      <p-button label="Add state" icon="pi pi-plus" (onClick)="openNew()"></p-button>
    </div>

    <p-card styleClass="mb-3">
      <div class="flex gap-2 align-items-end">
        <div class="field mb-0" style="flex: 1; max-width: 30rem">
          <label for="country">Filter by country</label>
          <p-dropdown inputId="country" [(ngModel)]="countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="All countries" [showClear]="true" [filter]="true" [appendTo]="'body'" styleClass="w-full" (onChange)="loadStates()"></p-dropdown>
        </div>
        <p-button label="Reset" severity="secondary" [outlined]="true" (onClick)="resetFilter()"></p-button>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="States" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>Country</th><th>Status</th><th style="width: 170px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-s>
          <tr>
            <td><i class="pi pi-map mr-2 muted"></i><strong>{{ s.name }}</strong></td>
            <td>{{ s.country?.name || '—' }}</td>
            <td><p-tag [value]="s.active ? 'Active' : 'Inactive'" [severity]="s.active ? 'success' : 'warning'"></p-tag></td>
            <td>
              <div class="flex gap-2">
                <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="openEdit(s)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="askDelete(s)" pTooltip="Delete"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4" class="text-center muted">No states found. Try clearing the filter.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" [header]="editing ? 'Edit state' : 'Add state'" [modal]="true" [style]="{ width: 'min(440px, 94vw)' }">
      <div class="flex flex-column gap-3">
        <div class="field mb-0" *ngIf="!editing">
          <label for="dlgCountry">Country</label>
          <p-dropdown inputId="dlgCountry" [(ngModel)]="form.countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="Select country" [filter]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
        </div>
        <div class="field mb-0">
          <label for="name">Name</label>
          <input pInputText id="name" [(ngModel)]="form.name" class="w-full" placeholder="e.g. Maharashtra" maxlength="100" />
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
export class MasterStatesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  countries: any[] = [];
  countryId = '';
  rows: any[] = [];
  loading = true;
  saving = false;
  error = '';
  dialog = false;
  editing: any = null;
  form: any = { countryId: '', name: '', active: true };

  ngOnInit() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => { this.countries = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.loadStates();
  }

  resetFilter() {
    this.countryId = '';
    this.loadStates();
  }

  loadStates() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    let params = new HttpParams();
    if (this.countryId) params = params.set('countryId', this.countryId);
    this.http.get<any>('/api/master/states', { params }).subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openNew() {
    this.editing = null;
    this.form = { countryId: this.countryId || '', name: '', active: true };
    this.dialog = true;
  }

  openEdit(s: any) {
    this.editing = s;
    this.form = { countryId: s.countryId || s.country?.id || '', name: s.name, active: !!s.active };
    this.dialog = true;
  }

  valid(): boolean {
    return !!(this.form.name?.trim() && (this.editing || this.form.countryId));
  }

  save() {
    this.saving = true;
    const req = this.editing
      ? this.http.patch<any>(`/api/master/states/${this.editing.id}`, {
          name: this.form.name.trim(),
          active: !!this.form.active,
        })
      : this.http.post<any>(`/api/master/countries/${this.form.countryId}/states`, {
          name: this.form.name.trim(),
          active: !!this.form.active,
        });
    req.subscribe({
      next: () => {
        this.errors.showSuccess(this.editing ? 'State updated.' : 'State created.');
        this.dialog = false;
        this.saving = false;
        this.loadStates();
      },
      error: (e) => {
        this.errors.handleHttpError(e, 'Save failed');
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  askDelete(s: any) {
    this.confirm.confirm({
      message: `Delete state ${s.name}? This is blocked if it has cities or users.`,
      header: 'Delete state',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/master/states/${s.id}`).subscribe({
          next: () => { this.errors.showSuccess('State deleted.'); this.loadStates(); },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
