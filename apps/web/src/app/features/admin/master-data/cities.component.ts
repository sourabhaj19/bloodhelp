import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Cities</h1>
    <p class="page-sub">Pick a country, then a state, to browse its cities.</p>
    <p-card styleClass="mb-3">
      <div class="formgrid grid">
        <div class="field col-12 md:col-6 mb-0">
          <label for="country">Country</label>
          <p-dropdown inputId="country" [(ngModel)]="countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="Select country" [filter]="true" styleClass="w-full" (onChange)="onCountry()"></p-dropdown>
        </div>
        <div class="field col-12 md:col-6 mb-0">
          <label for="state">State</label>
          <p-dropdown inputId="state" [(ngModel)]="stateId" [options]="states" optionLabel="name" optionValue="id" placeholder="Select state" [filter]="true" [disabled]="!countryId" styleClass="w-full" (onChange)="loadCities()"></p-dropdown>
        </div>
      </div>
    </p-card>
    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
    <p-card *ngIf="loading" header="Loading…"><p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1,2,3]"></p-skeleton></p-card>
    <p-card *ngIf="!loading" header="Cities" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm">
        <ng-template pTemplate="header"><tr><th>Name</th></tr></ng-template>
        <ng-template pTemplate="body" let-c><tr><td><i class="pi pi-building mr-2 muted"></i><strong>{{ c.name }}</strong></td></tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td class="text-center muted">{{ stateId ? 'No cities found for this state.' : 'Select a country and state first.' }}</td></tr></ng-template>
      </p-table>
    </p-card>
  `,
  styles: [` .muted { color: #98a2b3; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } `],
})
export class MasterCitiesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);
  countries: any[] = [];
  states: any[] = [];
  countryId = '';
  stateId = '';
  rows: any[] = [];
  loading = false;
  error = '';
  ngOnInit() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => { this.countries = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }
  onCountry() {
    this.states = [];
    this.stateId = '';
    this.rows = [];
    if (!this.countryId) return;
    this.http.get<any>(`/api/master/countries/${this.countryId}/states`).subscribe({
      next: (r) => { this.states = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: (e) => this.errors.handleHttpError(e, 'Failed to load states'),
    });
  }
  loadCities() {
    if (!this.stateId) { this.rows = []; return; }
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>(`/api/master/states/${this.stateId}/cities`).subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.errors.handleHttpError(e, 'Failed to load cities'); this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
