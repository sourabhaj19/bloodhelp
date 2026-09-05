import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">States</h1>
    <p class="page-sub">Pick a country to browse its states. Cities belong to a state.</p>
    <p-card styleClass="mb-3">
      <div class="field mb-0">
        <label for="country">Country</label>
        <p-dropdown inputId="country" [(ngModel)]="countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="Select country" [filter]="true" styleClass="w-full md:w-30rem" (onChange)="loadStates()"></p-dropdown>
      </div>
    </p-card>
    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
    <p-card *ngIf="loading" header="Loading…"><p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1,2,3]"></p-skeleton></p-card>
    <p-card *ngIf="!loading" header="States" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm">
        <ng-template pTemplate="header"><tr><th>Name</th></tr></ng-template>
        <ng-template pTemplate="body" let-s><tr><td><i class="pi pi-map mr-2 muted"></i><strong>{{ s.name }}</strong></td></tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td class="text-center muted">{{ countryId ? 'No states found for this country.' : 'Select a country first.' }}</td></tr></ng-template>
      </p-table>
      <p-button label="Manage cities" icon="pi pi-arrow-right" iconPos="right" severity="secondary" [outlined]="true" size="small" routerLink="/admin/master-data/cities" styleClass="mt-3"></p-button>
    </p-card>
  `,
  styles: [` .muted { color: #98a2b3; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } `],
})
export class MasterStatesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);
  countries: any[] = [];
  countryId = '';
  rows: any[] = [];
  loading = false;
  error = '';
  ngOnInit() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => { this.countries = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }
  loadStates() {
    if (!this.countryId) { this.rows = []; return; }
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>(`/api/master/countries/${this.countryId}/states`).subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.errors.handleHttpError(e, 'Failed to load states'); this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
