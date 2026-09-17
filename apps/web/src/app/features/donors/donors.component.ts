import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Subject, debounceTime } from 'rxjs';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { DonorMapComponent } from '../../shared/components/donor-map.component';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule, DonorMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Find donors</h1>
    <p class="page-sub">Authenticated search with contact details and precise location.</p>

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
          <input pInputText id="area" [(ngModel)]="filters.area" placeholder="Area / locality" class="w-full" (ngModelChange)="scheduleSearch()" />
        </div>
        <div class="field col-12 md:col-4">
          <label for="radius">Radius</label>
          <p-dropdown inputId="radius" [(ngModel)]="filters.radiusKm" [options]="radiusOptions" placeholder="Any radius" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          <small *ngIf="filters.radiusKm && filters.lat == null" class="p-error block mt-1">Radius needs location — click “Near me” first (filter will be ignored).</small>
        </div>
        <div class="col-12 flex align-items-end gap-2 flex-wrap">
          <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
          <p-button label="Near me" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()" pTooltip="Use GPS location for distance + radius"></p-button>
          <p-button label="View all on map" icon="pi pi-map" severity="secondary" [outlined]="true" (onClick)="showAllOnMap()" [disabled]="loading || mappableCount === 0" pTooltip="Fit all donor pins into the map view below"></p-button>
          <p-button label="Reset" severity="secondary" [text]="true" (onClick)="reset()"></p-button>
          <span *ngIf="filters.lat != null" class="muted text-sm ml-2" [pTooltip]="filters.lat + ', ' + filters.lng" tooltipPosition="bottom">📍 Location enabled · distance shown</span>
          <p-button *ngIf="filters.lat != null" label="Clear location" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="clearLocation()"></p-button>
        </div>
        <small class="muted" *ngIf="filters.lat == null && !filters.radiusKm">Tip: click <strong>Near me</strong> to enable the <strong>Distance</strong> column and radius filtering.</small>
        <p-message *ngIf="filters.lat == null && filters.radiusKm" severity="warn" text="You set a radius but location is off — enable “Near me” to filter by distance." styleClass="w-full mt-2"></p-message>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Searching…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3, 4]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading && result" header="Donors" [subheader]="result.total + ' found'">
      <div class="desktop-table">
      <p-table [value]="result.items ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>Blood</th><th>Mobile</th><th>Address</th><th>Distance</th><th>Map</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td><strong>{{ d.displayName || d.fullName }}</strong></td>
            <td><p-tag [value]="d.bloodGroup" severity="danger"></p-tag></td>
            <td><span *ngIf="d.mobile || d.maskedMobile"><i class="pi pi-phone mr-1 muted"></i>{{ d.mobile || d.maskedMobile }}</span><span *ngIf="!d.mobile && !d.maskedMobile" class="muted">—</span></td>
            <td><div>{{ d.state }}<span *ngIf="d.city"> · {{ d.city }}</span></div><div *ngIf="d.area" class="muted text-sm">{{ d.area }}</div><div *ngIf="d.pinCode" class="muted text-sm">{{ d.pinCode }}</div></td>
            <td><span *ngIf="d.approxDistanceKm != null">~{{ d.approxDistanceKm }} km</span><span *ngIf="d.approxDistanceKm == null" class="muted">—</span></td>
            <td>
              <p-button
                *ngIf="d.latitude && d.longitude"
                label="View on map"
                icon="pi pi-map-marker"
                size="small"
                severity="secondary"
                [outlined]="true"
                (onClick)="focusOnMap(d)">
              </p-button>
              <span *ngIf="!d.latitude || !d.longitude" class="muted text-sm">—</span>
            </td>
            <td>
              <div class="flex gap-2">
                <p-button [label]="thankedIds.has(d.id) ? 'Thanked' : 'Thank'" icon="pi pi-heart" size="small" [severity]="thankedIds.has(d.id) ? 'success' : 'secondary'" [outlined]="!thankedIds.has(d.id)" [disabled]="thankedIds.has(d.id)" (onClick)="openThank(d)" [pTooltip]="thankedIds.has(d.id) ? 'You already thanked this donor' : 'Send thanks'"></p-button>
                <p-button *ngIf="d.id !== myId" icon="pi pi-flag" size="small" severity="secondary" [text]="true" (onClick)="openReport(d)" pTooltip="Report user"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="text-center muted">No donors match. Try a wider radius.</td></tr>
        </ng-template>
      </p-table>
      </div>
      <!-- Mobile cards -->
      <div class="mobile-cards">
        <div *ngIf="!result.items?.length" class="text-center muted p-3">No donors match. Try a wider radius.</div>
        <div *ngFor="let d of result.items ?? []" class="mobile-card">
          <div class="flex justify-content-between align-items-center mb-2">
            <strong>{{ d.displayName || d.fullName }}</strong>
            <p-tag [value]="d.bloodGroup" severity="danger"></p-tag>
          </div>
          <div class="text-sm mb-1"><i class="pi pi-phone mr-1 muted"></i>{{ d.mobile || d.maskedMobile || '—' }}</div>
          <div class="text-sm mb-1"><i class="pi pi-map-marker mr-1 muted"></i>{{ d.state }}<span *ngIf="d.city"> · {{ d.city }}</span><span *ngIf="d.area"> · {{ d.area }}</span><span *ngIf="d.pinCode"> — {{ d.pinCode }}</span></div>
          <div class="text-sm mb-2"><span *ngIf="d.approxDistanceKm != null" class="font-bold" style="color:#b42318">~{{ d.approxDistanceKm }} km away</span><span *ngIf="d.approxDistanceKm == null" class="muted">Distance — enable “Near me”</span></div>
          <div class="flex gap-2 flex-wrap">
            <p-button *ngIf="d.latitude && d.longitude" label="View on map" icon="pi pi-map-marker" size="small" severity="secondary" [outlined]="true" (onClick)="focusOnMap(d)" styleClass="mobile-action"></p-button>
            <p-button [label]="thankedIds.has(d.id) ? 'Thanked' : 'Thank'" icon="pi pi-heart" size="small" [severity]="thankedIds.has(d.id) ? 'success' : 'secondary'" [outlined]="!thankedIds.has(d.id)" [disabled]="thankedIds.has(d.id)" (onClick)="openThank(d)" styleClass="mobile-action"></p-button>
            <p-button *ngIf="d.id !== myId" icon="pi pi-flag" label="Report" size="small" severity="secondary" [text]="true" (onClick)="openReport(d)" styleClass="mobile-action"></p-button>
          </div>
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

    <p-dialog [(visible)]="mapDialog" [modal]="true" [dismissableMask]="true" [draggable]="false" appendTo="body" [baseZIndex]="1100" [autoZIndex]="true" [keepInViewport]="true" [blockScroll]="true" [resizable]="false"
      [style]="{ width: 'min(900px, 96vw)' }" [header]="mapDialogTitle" [contentStyle]="{'overflow':'auto'}" styleClass="centered-dialog"
      (onShow)="onMapDialogShow()" (onHide)="onMapDialogHide()">
      <app-donor-map *ngIf="mapDialog"
        [donors]="mapDialogDonors"
        [centerLat]="filters.lat"
        [centerLng]="filters.lng"
        [focusId]="focusedDonorId"
        [height]="420">
      </app-donor-map>
      <div class="flex align-items-center gap-2 mt-2 flex-wrap">
        <span class="muted text-sm">📍 {{ mapDialogPlotted }} plotted · ◎ search center · OpenStreetMap</span>
        <span class="flex-grow-1"></span>
        <p-button *ngIf="mapDialogMode === 'single'" label="Show all pins" icon="pi pi-map" size="small" severity="secondary" [outlined]="true" (onClick)="dialogShowAll()"></p-button>
      </div>
    </p-dialog>

    <p-dialog [(visible)]="reportDialog" header="Report user" [modal]="true" [dismissableMask]="true" [draggable]="false" appendTo="body" [baseZIndex]="1100" [autoZIndex]="true" [keepInViewport]="true" [blockScroll]="true" [resizable]="false" [style]="{ width: 'min(460px, 94vw)' }" [contentStyle]="{'overflow':'auto'}" styleClass="centered-dialog">
      <p class="mt-0">Reporting <strong>{{ reportTarget?.displayName || reportTarget?.fullName }}</strong>. Reports are reviewed by admins; false reports may affect your account.</p>
      <div class="flex flex-column gap-3">
        <div class="field mb-0">
          <label for="reason">Reason</label>
          <p-dropdown inputId="reason" [(ngModel)]="report.reasonId" [options]="reasons" optionLabel="label" optionValue="id" placeholder="Select a reason" [filter]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
        </div>
        <div class="field mb-0">
          <label for="desc">Details (optional)</label>
          <textarea pInputTextarea id="desc" [(ngModel)]="report.description" rows="4" maxlength="1000" class="w-full" placeholder="What happened?"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="reportDialog = false"></p-button>
        <p-button label="Submit report" icon="pi pi-flag" severity="danger" (onClick)="submitReport()" [loading]="reporting" [disabled]="!report.reasonId"></p-button>
      </ng-template>
    </p-dialog>

    <p-dialog [(visible)]="thankDialog" header="Send thanks" [modal]="true" [dismissableMask]="true" [draggable]="false" appendTo="body" [baseZIndex]="1100" [autoZIndex]="true" [keepInViewport]="true" [blockScroll]="true" [resizable]="false" [style]="{ width: 'min(460px, 94vw)' }" [contentStyle]="{'overflow':'auto'}" styleClass="centered-dialog">
      <p class="mt-0">Send thanks to <strong>{{ thankTarget?.displayName || thankTarget?.fullName }}</strong> for being a donor.</p>
      <div class="field mb-0">
        <label for="thankMsg">Message (optional)</label>
        <textarea pInputTextarea id="thankMsg" [(ngModel)]="thankMessage" rows="4" maxlength="500" class="w-full" placeholder="Thank you for being a donor!"></textarea>
        <small class="muted">{{ thankMessage.length }}/500</small>
      </div>
      <small class="muted block mt-2">You can thank the same donor once per 24 hours.</small>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="thankDialog = false"></p-button>
        <p-button label="Send thanks" icon="pi pi-heart" (onClick)="submitThank()" [loading]="thanking"></p-button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .muted { color: #98a2b3; }
      .desktop-table { display: block; }
      .mobile-cards { display: none; }
      .mobile-card {
        border: 1px solid #eaecf0;
        border-radius: 14px;
        padding: 14px;
        background: #fff;
        margin-bottom: 12px;
      }
      :host ::ng-deep .mobile-action { min-height: 44px; }
      @media (max-width: 767px) {
        .desktop-table { display: none; }
        .mobile-cards { display: block; }
      }
    `,
  ],
})
export class DonorsComponent implements OnInit, OnDestroy {
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
  myId = '';
  focusedDonorId: string | null = null;

  reasons: any[] = [];
  reasonsLoaded = false;
  reportDialog = false;
  reporting = false;
  reportTarget: any = null;
  report: any = { reasonId: '', description: '' };
  thankDialog = false;
  thanking = false;
  thankTarget: any = null;
  thankMessage = 'Thank you for being a donor!';
  thankedIds = new Set<string>();
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
    // Load profile first so the initial search already carries lat/lng —
    // that way distance is calculated on first load without needing "Near me".
    // If URL already has lat/lng, keep URL over profile.
    const hasUrlLat = this.filters.lat != null;
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => {
        const me = r.data ?? r;
        this.myId = me?.id || '';
        if (!hasUrlLat && me?.latitude != null && me?.longitude != null && this.filters.lat == null) {
          this.filters.lat = me.latitude;
          this.filters.lng = me.longitude;
        }
        this.loadCountries();
        this.cdr.markForCheck();
      },
      error: () => this.loadCountries(),
    });
  }

  ngOnDestroy() { this.searchSub?.unsubscribe(); }

  scheduleSearch() { this.searchSubject.next(); }

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
          this.onCountryChange(true);
        }
        this.search();
        this.cdr.markForCheck();
      },
      error: () => this.search(),
    });
  }

  onCountryChange(preserve = false) {
    const keepState = preserve ? this.filters.stateId : '';
    const keepCity = preserve ? this.filters.cityId : '';
    if (!preserve) {
      this.states = [];
      this.cities = [];
      this.filters.stateId = '';
      this.filters.cityId = '';
    }
    if (!this.filters.countryId) { this.cdr.markForCheck(); return; }
    this.http.get<any>(`/api/master/countries/${this.filters.countryId}/states`).subscribe({
      next: (r) => {
        this.states = r.data ?? r ?? [];
        if (preserve && keepState) {
          this.filters.stateId = keepState;
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
    // Hidden geo center (Near me / profile) — only sent when present so
    // radius + distance work; no lat/lng inputs in the filter UI.
    if (this.filters.lat != null && this.filters.lat !== '') p = p.set('lat', String(this.filters.lat));
    if (this.filters.lng != null && this.filters.lng !== '') p = p.set('lng', String(this.filters.lng));
    if (this.filters.radiusKm) p = p.set('radiusKm', this.filters.radiusKm);
    p = p.set('page', String(this.filters.page));
    p = p.set('pageSize', String(this.filters.pageSize));
    return p;
  }

  get mappableCount(): number {
    const items = this.result?.items ?? [];
    return items.filter((d: any) => this.hasCoords(d)).length;
  }

  private hasCoords(d: any): boolean {
    const lat = Number(d?.latitude);
    const lng = Number(d?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  @ViewChild(DonorMapComponent) donorMap?: DonorMapComponent;

  // ── Map dialog (modal) state ──────────────────────────────────────────
  mapDialog = false;
  mapDialogMode: 'single' | 'all' = 'all';
  mapDialogDonor: any = null;
  // Stored as a field (not a getter): a new array identity every CD cycle
  // would retrigger the map's ngOnChanges endlessly.
  mapDialogDonors: any[] = [];

  get mapDialogTitle(): string {
    if (this.mapDialogMode === 'single' && this.mapDialogDonor) {
      const name = this.mapDialogDonor.displayName || this.mapDialogDonor.fullName || 'Donor';
      return `${name} — on map`;
    }
    return `Donor map (${this.mapDialogPlotted} plotted)`;
  }

  get mapDialogPlotted(): number {
    return (this.mapDialogDonors ?? []).filter((d: any) => this.hasCoords(d)).length;
  }

  /** Per-row "View on map" — open the modal focused on one donor. */
  focusOnMap(d: any) {
    if (!this.hasCoords(d)) return;
    this.mapDialogMode = 'single';
    this.mapDialogDonor = d;
    this.mapDialogDonors = [d];
    this.focusedDonorId = String(d.id);
    this.mapDialog = true;
    this.cdr.markForCheck();
  }

  /** "View all on map" — open the modal with every pin from current results. */
  showAllOnMap() {
    if (this.mappableCount === 0) {
      this.errors.showWarn('No donor pins to show for the current results.');
      return;
    }
    this.mapDialogMode = 'all';
    this.mapDialogDonor = null;
    this.mapDialogDonors = [...(this.result?.items ?? [])];
    this.focusedDonorId = null;
    this.mapDialog = true;
    this.cdr.markForCheck();
  }

  /** Fired once the dialog is visible (has real size) — drive the map. */
  onMapDialogShow() {
    // The map child may still be fetching tile config — focusDonor/showAll
    // queue a pending request and apply it once the map is ready.
    setTimeout(() => {
      if (this.mapDialogMode === 'single' && this.mapDialogDonor) {
        this.donorMap?.focusDonor(String(this.mapDialogDonor.id));
      } else {
        this.donorMap?.showAll();
      }
    }, 120);
  }

  onMapDialogHide() {
    this.mapDialogDonor = null;
    this.mapDialogDonors = [];
    this.focusedDonorId = null;
  }

  /** Inside the dialog: switch from single-pin to all-pins view. */
  dialogShowAll() {
    this.mapDialogMode = 'all';
    this.mapDialogDonor = null;
    this.mapDialogDonors = [...(this.result?.items ?? [])];
    this.focusedDonorId = null;
    this.cdr.markForCheck();
    setTimeout(() => this.donorMap?.showAll(), 120);
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
      next: (r) => {
        this.result = r.data ?? r;
        // Drop pin focus if the focused donor is no longer in the results.
        const ids = new Set((this.result?.items ?? []).map((d: any) => String(d?.id)));
        if (this.focusedDonorId && !ids.has(String(this.focusedDonorId))) {
          this.focusedDonorId = null;
          this.donorMap?.clearFocus();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  reset() {
    this.filters = { bloodGroupId: '', countryId: this.defaultCountryId, stateId: '', cityId: '', area: '', radiusKm: '', lat: this.filters.lat ?? null, lng: this.filters.lng ?? null, page: 1, pageSize: 20 };
    this.states = [];
    this.cities = [];
    if (this.filters.countryId) this.onCountryChange();
    this.focusedDonorId = null;
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
      this.errors.showWarn('Geolocation needs https or localhost.');
      return;
    }
    const onSuccess = (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy;
      this.filters.lat = Number(pos.coords.latitude.toFixed(6));
      this.filters.lng = Number(pos.coords.longitude.toFixed(6));
      this.filters.radiusKm = '10';
      if (acc != null && acc > 1000) this.errors.showWarn(`Location found but low accuracy (±${Math.round(acc)} m).`);
      else if (acc != null && acc > 200) this.errors.showInfo(`Location captured (±${Math.round(acc)} m).`);
      this.cdr.markForCheck();
      this.search();
    };
    const onLowFail = (err: GeolocationPositionError) => {
      const c = (err as any)?.code;
      if (c === 1) this.errors.showWarn('Location permission denied.');
      else if (c === 3) this.errors.showWarn('Location timed out. Try outdoors.');
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

  openThank(donor: any) {
    if (this.thankedIds.has(donor.id)) return;
    this.thankTarget = donor;
    this.thankMessage = 'Thank you for being a donor!';
    this.thankDialog = true;
    this.cdr.markForCheck();
  }

  async submitThank() {
    if (!this.thankTarget || this.thanking) return;
    this.thanking = true;
    try {
      const msg = String(this.thankMessage ?? '').trim() || 'Thank you for being a donor!';
      await firstValueFrom(
        this.http.post<any>('/api/appreciations', {
          receiverUserId: this.thankTarget.id,
          message: msg.slice(0, 500),
        }),
      );
      this.thankedIds.add(String(this.thankTarget.id));
      this.errors.showSuccess(`Thanks sent to ${this.thankTarget.displayName || this.thankTarget.fullName || 'donor'}.`);
      this.thankDialog = false;
    } catch (e: any) {
      const msg = this.errors.getUserMessage(e);
      if (String(msg).toLowerCase().includes('already') || String(e?.error?.code).includes('DUPLICATE')) {
        this.errors.showWarn('You already thanked this donor in the last 24 hours.');
        if (this.thankTarget) this.thankedIds.add(String(this.thankTarget.id));
        this.thankDialog = false;
      } else {
        this.errors.handleHttpError(e, 'Failed to send thanks');
      }
    } finally {
      this.thanking = false;
      this.cdr.markForCheck();
    }
  }

  openReport(donor: any) {
    this.reportTarget = donor;
    this.report = { reasonId: '', description: '' };
    this.reportDialog = true;
    this.cdr.markForCheck();
    if (!this.reasonsLoaded) {
      this.http.get<any>('/api/reports/reasons').subscribe({
        next: (r) => {
          this.reasons = r.data ?? r ?? [];
          this.reasonsLoaded = true;
          this.cdr.markForCheck();
        },
        error: (e) => this.errors.handleHttpError(e, 'Failed to load report reasons'),
      });
    }
  }

  async submitReport() {
    if (!this.reportTarget || !this.report.reasonId) return;
    this.reporting = true;
    try {
      const payload: any = {
        reportedUserId: this.reportTarget.id,
        reasonId: this.report.reasonId,
      };
      if (this.report.description?.trim()) payload.description = this.report.description.trim();
      await firstValueFrom(this.http.post<any>('/api/reports', payload));
      this.errors.showSuccess('Report submitted. Admins will review it.');
      this.reportDialog = false;
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to submit report');
    } finally {
      this.reporting = false;
      this.cdr.markForCheck();
    }
  }
}
