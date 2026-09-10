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
      <p class="page-sub">Public results show masked name & phone with approximate distance (share your location for distance). <a routerLink="/login" class="link">Log in</a> for full contact & map.</p>

      <p-card styleClass="mb-3">
        <div class="formgrid grid">
          <div class="field col-12 md:col-4">
            <label for="bg">Blood group</label>
            <p-dropdown inputId="bg" [(ngModel)]="filters.bloodGroupId" [options]="bloodGroups" optionLabel="code" optionValue="id" placeholder="All groups" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          </div>
          <div class="field col-12 md:col-4">
            <label for="country">Country</label>
            <p-dropdown inputId="country" [(ngModel)]="filters.countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="Select country" [filter]="true" [showClear]="true" [appendTo]="'body'" (onChange)="onCountryChange()" styleClass="w-full"></p-dropdown>
          </div>
          <div class="field col-12 md:col-4">
            <label for="state">State</label>
            <p-dropdown inputId="state" [(ngModel)]="filters.stateId" [options]="states" optionLabel="name" optionValue="id" placeholder="Select state" [filter]="true" [showClear]="true" [appendTo]="'body'" [disabled]="!filters.countryId" (onChange)="onStateChange()" styleClass="w-full"></p-dropdown>
          </div>
          <div class="field col-12 md:col-4">
            <label for="city">City</label>
            <p-dropdown inputId="city" [(ngModel)]="filters.cityId" [options]="cities" optionLabel="name" optionValue="id" placeholder="Select city" [filter]="true" [showClear]="true" [appendTo]="'body'" [disabled]="!filters.stateId" styleClass="w-full"></p-dropdown>
          </div>
          <div class="field col-12 md:col-4">
            <label for="area">Area</label>
            <input pInputText id="area" [(ngModel)]="filters.area" placeholder="e.g. Andheri" class="w-full" />
          </div>
          <div class="field col-12 md:col-4">
            <label for="radius">Radius</label>
            <p-dropdown inputId="radius" [(ngModel)]="filters.radiusKm" [options]="radiusOptions" placeholder="Any radius" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          </div>
          <div class="col-12 flex align-items-center gap-2 flex-wrap">
            <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
            <p-button label="Near me" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()" pTooltip="Use GPS location for distance + radius"></p-button>
            <p-button *ngIf="filters.lat != null" label="Clear location" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="clearLocation()"></p-button>
            <p-button label="Reset" severity="secondary" [outlined]="true" (onClick)="reset()"></p-button>
            <span *ngIf="filters.lat != null" class="muted text-sm ml-2">📍 ~{{ filters.lat }}, {{ filters.lng }} · distance shown</span>
          </div>
        </div>
        <small class="muted" *ngIf="filters.lat == null">Tip: click <strong>Near me</strong> to enable the <strong>Distance</strong> column and radius filtering.</small>
      </p-card>

      <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

      <p-card *ngIf="loading" header="Searching…">
        <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
      </p-card>

      <p-card *ngIf="!loading && result" header="Results" [subheader]="result.total + ' donor(s) found'">
        <p-table [value]="result.items ?? []" [tableStyle]="{ 'min-width': '720px' }" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Donor</th><th>Blood</th><th>Phone</th><th>Location</th><th>Distance</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-d>
            <tr>
              <td><i class="pi pi-user mr-2 muted"></i><strong>{{ d.displayName }}</strong></td>
              <td><p-tag [value]="d.bloodGroup" severity="danger"></p-tag></td>
              <td>
                <span *ngIf="d.maskedMobile"><i class="pi pi-phone mr-1 muted"></i>{{ d.maskedMobile }}</span>
                <span *ngIf="!d.maskedMobile" class="muted">—</span>
              </td>
              <td>{{ d.city }}<span *ngIf="d.area"> · {{ d.area }}</span></td>
              <td>
                <span *ngIf="d.approxDistanceKm != null">~{{ d.approxDistanceKm }} km</span>
                <span *ngIf="d.approxDistanceKm == null" class="muted" pTooltip="Share location (Near me) to see distance">—</span>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center muted">No donors found. Try widening the radius or clearing filters.</td></tr>
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
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  radiusOptions = [
    { label: '5 km', value: '5' },
    { label: '10 km', value: '10' },
    { label: '25 km', value: '25' },
    { label: '50 km', value: '50' },
    { label: '100 km', value: '100' },
  ];
  loading = false;
  error = '';
  result: any = null;
  filters: any = { bloodGroupId: '', countryId: '', stateId: '', cityId: '', area: '', radiusKm: '', lat: null, lng: null, page: 1, pageSize: 20 };
  private defaultCountryId = '';

  ngOnInit() {
    this.http.get<any>('/api/master/blood-groups').subscribe({
      next: (r) => { this.bloodGroups = r.data ?? r; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.loadCountries();
  }

  private pickDefaultCountry(list: any[]): string {
    if (!list?.length) return '';
    const india = list.find((c) => c.isoCode2 === 'IN' || String(c.name ?? '').toLowerCase() === 'india');
    if (india) return india.id;
    if (list.length === 1) return list[0].id;
    return '';
  }

  loadCountries() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => {
        this.countries = r.data ?? r ?? [];
        this.defaultCountryId = this.pickDefaultCountry(this.countries);
        if (this.defaultCountryId && !this.filters.countryId) {
          this.filters.countryId = this.defaultCountryId;
          this.onCountryChange();
        }
        this.search();
        this.cdr.markForCheck();
      },
      error: () => this.search(),
    });
  }

  onCountryChange() {
    this.states = [];
    this.cities = [];
    this.filters.stateId = '';
    this.filters.cityId = '';
    if (!this.filters.countryId) { this.cdr.markForCheck(); return; }
    this.http.get<any>(`/api/master/countries/${this.filters.countryId}/states`).subscribe({
      next: (r) => { this.states = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  onStateChange() {
    this.cities = [];
    this.filters.cityId = '';
    if (!this.filters.stateId) { this.cdr.markForCheck(); return; }
    this.http.get<any>(`/api/master/states/${this.filters.stateId}/cities`).subscribe({
      next: (r) => { this.cities = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  buildParams() {
    let p = new HttpParams();
    if (this.filters.bloodGroupId) p = p.set('bloodGroupId', this.filters.bloodGroupId);
    if (this.filters.countryId) p = p.set('countryId', this.filters.countryId);
    if (this.filters.stateId) p = p.set('stateId', this.filters.stateId);
    if (this.filters.cityId) p = p.set('cityId', this.filters.cityId);
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
    this.filters = { bloodGroupId: '', countryId: this.defaultCountryId, stateId: '', cityId: '', area: '', radiusKm: '', lat: null, lng: null, page: 1, pageSize: 20 };
    this.states = [];
    this.cities = [];
    if (this.filters.countryId) this.onCountryChange();
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

  useMyLocation() {
    if (!navigator.geolocation) {
      this.errors.showWarn('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.filters.lat = Number(pos.coords.latitude.toFixed(6));
        this.filters.lng = Number(pos.coords.longitude.toFixed(6));
        if (!this.filters.radiusKm) this.filters.radiusKm = '10';
        this.cdr.markForCheck();
        this.search();
      },
      () => this.errors.showWarn('Unable to get your location. Please allow location access.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  clearLocation() {
    this.filters.lat = null;
    this.filters.lng = null;
    this.filters.radiusKm = '';
    this.cdr.markForCheck();
    this.search();
  }
}
