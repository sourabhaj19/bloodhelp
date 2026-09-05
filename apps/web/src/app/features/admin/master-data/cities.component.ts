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
        <h1 class="page-title">Cities</h1>
        <p class="page-sub">All cities by default — filter by country and state. Delete is blocked while users reference a city.</p>
      </div>
      <p-button label="Add city" icon="pi pi-plus" (onClick)="openNew()"></p-button>
    </div>

    <p-card styleClass="mb-3">
      <div class="flex gap-2 align-items-end flex-wrap">
        <div class="field mb-0" style="flex: 1; min-width: 12rem">
          <label for="country">Filter by country</label>
          <p-dropdown inputId="country" [(ngModel)]="countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="All countries" [showClear]="true" [filter]="true" [appendTo]="'body'" styleClass="w-full" (onChange)="onCountryFilter()"></p-dropdown>
        </div>
        <div class="field mb-0" style="flex: 1; min-width: 12rem">
          <label for="state">Filter by state</label>
          <p-dropdown inputId="state" [(ngModel)]="stateId" [options]="states" optionLabel="name" optionValue="id" placeholder="All states" [showClear]="true" [filter]="true" [appendTo]="'body'" styleClass="w-full" (onChange)="loadCities()"></p-dropdown>
        </div>
        <p-button label="Reset" severity="secondary" [outlined]="true" (onClick)="resetFilter()"></p-button>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="Cities" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>State</th><th>Country</th><th>Status</th><th style="width: 170px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><i class="pi pi-building mr-2 muted"></i><strong>{{ c.name }}</strong></td>
            <td>{{ c.state?.name || '—' }}</td>
            <td>{{ c.state?.country?.name || '—' }}</td>
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
          <tr><td colspan="5" class="text-center muted">No cities found. Try clearing the filters.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" [header]="editing ? 'Edit city' : 'Add city'" [modal]="true" [style]="{ width: 'min(460px, 94vw)' }">
      <div class="flex flex-column gap-3">
        <ng-container *ngIf="!editing">
          <div class="field mb-0">
            <label for="dlgCountry">Country</label>
            <p-dropdown inputId="dlgCountry" [(ngModel)]="form.countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="Select country" [filter]="true" [appendTo]="'body'" styleClass="w-full" (onChange)="onDialogCountry()"></p-dropdown>
          </div>
          <div class="field mb-0">
            <label for="dlgState">State</label>
            <p-dropdown inputId="dlgState" [(ngModel)]="form.stateId" [options]="dialogStates" optionLabel="name" optionValue="id" placeholder="Select state" [filter]="true" [disabled]="!form.countryId" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          </div>
        </ng-container>
        <div class="field mb-0">
          <label for="name">Name</label>
          <input pInputText id="name" [(ngModel)]="form.name" class="w-full" placeholder="e.g. Mumbai" maxlength="100" />
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
export class MasterCitiesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  countries: any[] = [];
  states: any[] = [];
  dialogStates: any[] = [];
  countryId = '';
  stateId = '';
  rows: any[] = [];
  loading = true;
  saving = false;
  error = '';
  dialog = false;
  editing: any = null;
  form: any = { countryId: '', stateId: '', name: '', active: true };

  ngOnInit() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => { this.countries = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.loadCities();
  }

  resetFilter() {
    this.countryId = '';
    this.stateId = '';
    this.states = [];
    this.loadCities();
  }

  onCountryFilter() {
    this.stateId = '';
    this.states = [];
    if (!this.countryId) {
      this.loadCities();
      return;
    }
    this.http.get<any>(`/api/master/countries/${this.countryId}/states`).subscribe({
      next: (r) => { this.states = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: (e) => this.errors.handleHttpError(e, 'Failed to load states'),
    });
    this.loadCities();
  }

  loadCities() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    let params = new HttpParams();
    if (this.stateId) params = params.set('stateId', this.stateId);
    else if (this.countryId) params = params.set('countryId', this.countryId);
    this.http.get<any>('/api/master/cities', { params }).subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openNew() {
    this.editing = null;
    this.form = { countryId: this.countryId || '', stateId: this.stateId || '', name: '', active: true };
    this.dialogStates = this.countryId ? [...this.states] : [];
    if (this.form.countryId && !this.dialogStates.length) this.loadDialogStates(this.form.countryId);
    this.dialog = true;
  }

  onDialogCountry() {
    this.form.stateId = '';
    this.dialogStates = [];
    if (this.form.countryId) this.loadDialogStates(this.form.countryId);
  }

  private loadDialogStates(countryId: string) {
    this.http.get<any>(`/api/master/countries/${countryId}/states`).subscribe({
      next: (r) => { this.dialogStates = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: (e) => this.errors.handleHttpError(e, 'Failed to load states'),
    });
  }

  openEdit(c: any) {
    this.editing = c;
    this.form = { countryId: '', stateId: '', name: c.name, active: !!c.active };
    this.dialog = true;
  }

  valid(): boolean {
    return !!(this.form.name?.trim() && (this.editing || this.form.stateId));
  }

  save() {
    this.saving = true;
    const req = this.editing
      ? this.http.patch<any>(`/api/master/cities/${this.editing.id}`, {
          name: this.form.name.trim(),
          active: !!this.form.active,
        })
      : this.http.post<any>(`/api/master/states/${this.form.stateId}/cities`, {
          name: this.form.name.trim(),
          active: !!this.form.active,
        });
    req.subscribe({
      next: () => {
        this.errors.showSuccess(this.editing ? 'City updated.' : 'City created.');
        this.dialog = false;
        this.saving = false;
        this.loadCities();
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
      message: `Delete city ${c.name}? This is blocked if any user references it.`,
      header: 'Delete city',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/master/cities/${c.id}`).subscribe({
          next: () => { this.errors.showSuccess('City deleted.'); this.loadCities(); },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
