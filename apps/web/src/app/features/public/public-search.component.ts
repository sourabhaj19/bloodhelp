import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';
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
            <input pInputText id="area" [(ngModel)]="filters.area" placeholder="e.g. Andheri" class="w-full" (ngModelChange)="scheduleSearch()" />
          </div>
          <div class="field col-12 md:col-4">
            <label for="radius">Radius</label>
            <p-dropdown inputId="radius" [(ngModel)]="filters.radiusKm" [options]="radiusOptions" placeholder="Any radius" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
            <small *ngIf="filters.radiusKm && filters.lat == null" class="p-error block mt-1">Radius needs location — click “Near me” first (filter will be ignored).</small>
          </div>
          <div class="col-12 flex align-items-center gap-2 flex-wrap">
            <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
            <p-button label="Near me" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()" pTooltip="Use GPS location for distance + radius"></p-button>
            <p-button *ngIf="filters.lat != null" label="Clear location" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="clearLocation()"></p-button>
            <p-button label="Reset" severity="secondary" [outlined]="true" (onClick)="reset()"></p-button>
            <span *ngIf="filters.lat != null" class="muted text-sm ml-2" [pTooltip]="filters.lat + ', ' + filters.lng" tooltipPosition="bottom">📍 Location enabled · distance shown</span>
          </div>
        </div>
        <small class="muted" *ngIf="filters.lat == null && !filters.radiusKm">Tip: click <strong>Near me</strong> to enable the <strong>Distance</strong> column and radius filtering.</small>
        <p-message *ngIf="filters.lat == null && filters.radiusKm" severity="warn" text="You set a radius but location is off — enable “Near me” to filter by distance." styleClass="w-full mt-2"></p-message>
      </p-card>

      <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

      <p-card *ngIf="loading" header="Searching…">
        <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
      </p-card>

      <p-card *ngIf="!loading && result" header="Results" [subheader]="result.total + ' donor(s) found'">
        <div class="desktop-table">
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
        </div>
        <!-- Mobile card fallback -->
        <div class="mobile-cards">
          <div *ngIf="!result.items?.length" class="text-center muted p-3">No donors found. Try widening the radius or clearing filters.</div>
          <div *ngFor="let d of result.items ?? []" class="mobile-card">
            <div class="flex justify-content-between align-items-center mb-2">
              <strong><i class="pi pi-user mr-1 muted"></i>{{ d.displayName }}</strong>
              <p-tag [value]="d.bloodGroup" severity="danger"></p-tag>
            </div>
            <div class="text-sm mb-1"><i class="pi pi-phone mr-1 muted"></i>{{ d.maskedMobile || '—' }}</div>
            <div class="text-sm mb-1"><i class="pi pi-map-marker mr-1 muted"></i>{{ d.city }}<span *ngIf="d.area"> · {{ d.area }}</span></div>
            <div class="text-sm"><span *ngIf="d.approxDistanceKm != null" class="font-bold" style="color:#b42318">~{{ d.approxDistanceKm }} km away</span><span *ngIf="d.approxDistanceKm == null" class="muted">Distance — enable “Near me”</span></div>
          </div>
        </div>
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
      .desktop-table { display: block; }
      .mobile-cards { display: none; }
      .mobile-card {
        border: 1px solid #eaecf0;
        border-radius: 12px;
        padding: 14px;
        background: #fff;
        margin-bottom: 10px;
      }
      @media (max-width: 767px) {
        .desktop-table { display: none; }
        .mobile-cards { display: block; }
        .page-wrap { padding: 16px; }
      }
    `,
  ],
})
export class PublicSearchComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
  private searchSubject = new Subject<void>();
  private searchSub: any = null;

  ngOnInit() {
    this.http.get<any>('/api/master/blood-groups').subscribe({
      next: (r) => { this.bloodGroups = r.data ?? r; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.applyQueryParams();
    this.searchSub = this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.doSearch());
    this.loadCountries();
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  scheduleSearch() {
    this.searchSubject.next();
  }

  private applyQueryParams() {
    const qp = this.route.snapshot.queryParamMap;
    const get = (k: string) => qp.get(k) ?? '';
    if (get('bloodGroupId')) this.filters.bloodGroupId = get('bloodGroupId');
    if (get('countryId')) this.filters.countryId = get('countryId');
    if (get('stateId')) this.filters.stateId = get('stateId');
    if (get('cityId')) this.filters.cityId = get('cityId');
    if (get('area')) this.filters.area = get('area');
    if (get('radiusKm')) this.filters.radiusKm = get('radiusKm');
    if (get('lat')) this.filters.lat = Number(get('lat'));
    if (get('lng')) this.filters.lng = Number(get('lng'));
    if (get('page')) this.filters.page = Number(get('page')) || 1;
    if (get('pageSize')) this.filters.pageSize = Number(get('pageSize')) || 20;
  }

  private syncUrl() {
    const qp: any = {};
    if (this.filters.bloodGroupId) qp.bloodGroupId = this.filters.bloodGroupId;
    if (this.filters.countryId) qp.countryId = this.filters.countryId;
    if (this.filters.stateId) qp.stateId = this.filters.stateId;
    if (this.filters.cityId) qp.cityId = this.filters.cityId;
    if (this.filters.area) qp.area = this.filters.area;
    if (this.filters.radiusKm) qp.radiusKm = this.filters.radiusKm;
    if (this.filters.lat != null) qp.lat = String(this.filters.lat);
    if (this.filters.lng != null) qp.lng = String(this.filters.lng);
    qp.page = String(this.filters.page);
    qp.pageSize = String(this.filters.pageSize);
    this.router.navigate([], { relativeTo: this.route, queryParams: qp, replaceUrl: true });
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
        } else if (this.filters.countryId) {
          // Restore dependent dropdowns from URL
          this.onCountryChange(true);
        }
        this.search();
        this.cdr.markForCheck();
      },
      error: () => this.search(),
    });
  }

  onCountryChange(preserveFilter = false) {
    const keepState = preserveFilter ? this.filters.stateId : '';
    const keepCity = preserveFilter ? this.filters.cityId : '';
    this.states = [];
    this.cities = [];
    if (!preserveFilter) {
      this.filters.stateId = '';
      this.filters.cityId = '';
    }
    if (!this.filters.countryId) { this.cdr.markForCheck(); return; }
    this.http.get<any>(`/api/master/countries/${this.filters.countryId}/states`).subscribe({
      next: (r) => {
        this.states = r.data ?? r ?? [];
        if (preserveFilter && keepState) {
          this.filters.stateId = keepState;
          // load cities with preserved city
          this.http.get<any>(`/api/master/states/${keepState}/cities`).subscribe({
            next: (cr) => {
              this.cities = cr.data ?? cr ?? [];
              if (keepCity) this.filters.cityId = keepCity;
              this.cdr.markForCheck();
            },
            error: () => this.cdr.markForCheck(),
          });
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onStateChange() {
    const preserve = this.filters.cityId;
    // If called from URL restore, preserveFilter handled above — here is user action
    // For normal user interaction, clear city
    if (!this.filters.stateId) { this.cities = []; this.filters.cityId=''; this.cdr.markForCheck(); return; }
    // Don't clear if we are restoring — but this method is user-triggered, so clear
    // We check if cities already loaded for preserve case above to avoid double clear
    this.cities = [];
    // Keep preserve value only if it was set via URL and states already loaded — but that path doesn't use this method
    this.filters.cityId = '';
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
    this.syncUrl();
    this.doSearch();
  }

  private doSearch() {
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
    if (typeof window !== 'undefined' && (window as any).isSecureContext === false) {
      this.errors.showWarn('Geolocation needs https or localhost. Please use map or type your area.');
      return;
    }
    const onSuccess = (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy;
      this.filters.lat = Number(pos.coords.latitude.toFixed(6));
      this.filters.lng = Number(pos.coords.longitude.toFixed(6));
      if (!this.filters.radiusKm) this.filters.radiusKm = '10';
      if (acc != null && acc > 1000) this.errors.showWarn(`Location found but low accuracy (±${Math.round(acc)} m). Move outdoors or adjust radius.`);
      else if (acc != null && acc > 200) this.errors.showInfo(`Location captured (±${Math.round(acc)} m).`);
      this.cdr.markForCheck();
      this.search();
    };
    const onLowFail = (err: GeolocationPositionError) => {
      const c = (err as any)?.code;
      if (c === 1) this.errors.showWarn('Location permission denied. Please allow location access.');
      else if (c === 3) this.errors.showWarn('Location timed out. Try again outdoors or type your area.');
      else this.errors.showWarn(`Location failed: ${err.message || 'unavailable'}.`);
    };
    const onHighFail = (err: GeolocationPositionError) => {
      const c = (err as any)?.code;
      if (c === 3 || c === 2) {
        navigator.geolocation.getCurrentPosition(onSuccess, onLowFail, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
      } else onLowFail(err);
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onHighFail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  clearLocation() {
    this.filters.lat = null;
    this.filters.lng = null;
    this.filters.radiusKm = '';
    this.cdr.markForCheck();
    this.search();
  }
}
