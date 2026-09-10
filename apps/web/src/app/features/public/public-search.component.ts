import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrap">
      <h1 class="page-title">Search donors</h1>
      <p class="page-sub">Public results hide contact details and show approximate distance only. <a routerLink="/login" class="link">Log in</a> for full contact & map.</p>

      <p-card styleClass="mb-3">
        <div class="formgrid grid">
          <div class="field col-12 md:col-3">
            <label for="bg">Blood group</label>
            <p-dropdown inputId="bg" [(ngModel)]="filters.bloodGroupId" [options]="bloodGroups" optionLabel="code" optionValue="id" placeholder="All groups" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          </div>
          <div class="field col-12 md:col-3">
            <label for="city">City</label>
            <input pInputText id="city" [(ngModel)]="filters.city" placeholder="e.g. Mumbai" class="w-full" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="area">Area</label>
            <input pInputText id="area" [(ngModel)]="filters.area" placeholder="e.g. Andheri" class="w-full" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="radius">Radius</label>
            <p-dropdown inputId="radius" [(ngModel)]="filters.radiusKm" [options]="radiusOptions" placeholder="Any radius" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          </div>
          <div class="field col-6 md:col-3">
            <label for="lat">Latitude</label>
            <p-inputNumber inputId="lat" [(ngModel)]="filters.lat" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full" placeholder="19.0760"></p-inputNumber>
          </div>
          <div class="field col-6 md:col-3">
            <label for="lng">Longitude</label>
            <p-inputNumber inputId="lng" [(ngModel)]="filters.lng" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full" placeholder="72.8777"></p-inputNumber>
          </div>
          <div class="col-12 md:col-6 flex align-items-center gap-2">
            <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
            <p-button label="Reset" severity="secondary" [outlined]="true" (onClick)="reset()"></p-button>
          </div>
        </div>
      </p-card>

      <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

      <p-card *ngIf="loading" header="Searching…">
        <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
      </p-card>

      <p-card *ngIf="!loading && result" header="Results" [subheader]="result.total + ' donor(s) found'">
        <p-table [value]="result.items ?? []" [tableStyle]="{ 'min-width': '100%' }" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Donor</th><th>Blood</th><th>Location</th><th>Distance</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-d>
            <tr>
              <td><i class="pi pi-user mr-2 muted"></i><strong>{{ d.displayName }}</strong></td>
              <td><p-tag [value]="d.bloodGroup" severity="danger"></p-tag></td>
              <td>{{ d.city }}<span *ngIf="d.area"> · {{ d.area }}</span></td>
              <td><span *ngIf="d.approxDistanceKm">~{{ d.approxDistanceKm }} km</span><span *ngIf="!d.approxDistanceKm" class="muted">—</span></td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="4" class="text-center muted">No donors found. Try widening the radius or clearing filters.</td></tr>
          </ng-template>
        </p-table>
        <p-paginator
          [rows]="filters.pageSize"
          [totalRecords]="result.total ?? 0"
          [rowsPerPageOptions]="[10, 20, 50]"
          [first]="(filters.page - 1) * filters.pageSize"
          (onPageChange)="onPage($event)"
          styleClass="mt-3">
        </p-paginator>
      </p-card>
    </div>
  `,
  styles: [
    `
      .page-wrap { max-width: 1180px; margin: 0 auto; padding: 24px; }
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { color: #667085; }
      .link { color: #b42318; font-weight: 600; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .muted { color: #98a2b3; }
    `,
  ],
})
export class PublicSearchComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  bloodGroups: any[] = [];
  radiusOptions = [
    { label: '5 km', value: '5' },
    { label: '10 km', value: '10' },
    { label: '25 km', value: '25' },
    { label: '50 km', value: '50' },
  ];
  loading = false;
  error = '';
  result: any = null;
  filters: any = { bloodGroupId: '', city: '', area: '', lat: null, lng: null, radiusKm: '', page: 1, pageSize: 20 };

  ngOnInit() {
    this.http.get<any>('/api/master/blood-groups').subscribe({
      next: (r) => { this.bloodGroups = r.data ?? r; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.search();
  }

  buildParams() {
    let p = new HttpParams();
    if (this.filters.bloodGroupId) p = p.set('bloodGroupId', this.filters.bloodGroupId);
    if (this.filters.city) p = p.set('city', this.filters.city);
    if (this.filters.area) p = p.set('area', this.filters.area);
    if (this.filters.lat != null && this.filters.lat !== '') p = p.set('lat', String(this.filters.lat));
    if (this.filters.lng != null && this.filters.lng !== '') p = p.set('lng', String(this.filters.lng));
    if (this.filters.radiusKm) p = p.set('radiusKm', this.filters.radiusKm);
    p = p.set('page', String(this.filters.page));
    p = p.set('pageSize', String(this.filters.pageSize));
    return p;
  }

  search() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/donors', { params: this.buildParams() }).subscribe({
      next: (r) => { this.result = r.data ?? r; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Search failed');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  reset() {
    this.filters = { bloodGroupId: '', city: '', area: '', lat: null, lng: null, radiusKm: '', page: 1, pageSize: 20 };
    this.search();
  }

  onSearch() {
    this.filters.page = 1;
    this.search();
  }

  onPage(e: any) {
    this.filters.page = e.page + 1;
    this.filters.pageSize = e.rows;
    this.search();
  }
}
