import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
        <div class="field col-12 md:col-3">
          <label for="bg">Blood group</label>
          <p-dropdown inputId="bg" [(ngModel)]="filters.bloodGroupId" [options]="bloodGroups" optionLabel="code" optionValue="id" placeholder="All groups" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
        </div>
        <div class="field col-12 md:col-3">
          <label for="city">City</label>
          <input pInputText id="city" [(ngModel)]="filters.city" placeholder="City" class="w-full" />
        </div>
        <div class="field col-6 md:col-3">
          <label for="area">Area</label>
          <input pInputText id="area" [(ngModel)]="filters.area" placeholder="Area" class="w-full" />
        </div>
        <div class="field col-6 md:col-3">
          <label for="pin">Pin code</label>
          <input pInputText id="pin" [(ngModel)]="filters.pinCode" placeholder="Pin code" class="w-full" />
        </div>
        <div class="field col-6 md:col-2">
          <label for="lat">Latitude</label>
          <p-inputNumber inputId="lat" [(ngModel)]="filters.lat" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full"></p-inputNumber>
        </div>
        <div class="field col-6 md:col-2">
          <label for="lng">Longitude</label>
          <p-inputNumber inputId="lng" [(ngModel)]="filters.lng" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full"></p-inputNumber>
        </div>
        <div class="field col-12 md:col-3">
          <label for="radius">Radius</label>
          <p-dropdown inputId="radius" [(ngModel)]="filters.radiusKm" [options]="radiusOptions" placeholder="Any radius" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
        </div>
        <div class="col-12 md:col-5 flex align-items-end gap-2 flex-wrap">
          <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
          <p-button label="Near me" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()"></p-button>
          <p-button label="View all on map" icon="pi pi-map" severity="secondary" [outlined]="true" (onClick)="showAllOnMap()" [disabled]="loading || mappableCount === 0" pTooltip="Fit all donor pins into the map view below"></p-button>
          <p-button label="Reset" severity="secondary" [text]="true" (onClick)="reset()"></p-button>
        </div>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Searching…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3, 4]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading && result" header="Donors" [subheader]="result.total + ' found'">
      <p-table [value]="result.items ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>Blood</th><th>Location</th><th>Distance</th><th>Map</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td><p-avatar [label]="(d.displayName || d.fullName || '?').charAt(0)" shape="circle" styleClass="mr-2"></p-avatar><strong>{{ d.displayName || d.fullName }}</strong></td>
            <td><p-tag [value]="d.bloodGroup" severity="danger"></p-tag></td>
            <td>{{ d.city }}<span *ngIf="d.area"> · {{ d.area }}</span><div *ngIf="d.pinCode" class="muted text-sm">{{ d.pinCode }}</div></td>
            <td><span *ngIf="d.approxDistanceKm">~{{ d.approxDistanceKm }} km</span><span *ngIf="!d.approxDistanceKm" class="muted">—</span></td>
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
                <p-button label="Thank" icon="pi pi-heart" size="small" severity="secondary" [outlined]="true" (onClick)="thank(d)"></p-button>
                <p-button *ngIf="d.id !== myId" icon="pi pi-flag" size="small" severity="secondary" [text]="true" (onClick)="openReport(d)" pTooltip="Report user"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center muted">No donors match. Try a wider radius.</td></tr>
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

    <p-dialog [(visible)]="mapDialog" [modal]="true" [dismissableMask]="true" [draggable]="false"
      [style]="{ width: 'min(900px, 96vw)' }" [header]="mapDialogTitle"
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

    <p-dialog [(visible)]="reportDialog" header="Report user" [modal]="true" [style]="{ width: 'min(460px, 94vw)' }">
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

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .muted { color: #98a2b3; }
    `,
  ],
})
export class DonorsComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  bloodGroups: any[] = [];
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
  filters: any = { bloodGroupId: '', city: '', area: '', pinCode: '', lat: null, lng: null, radiusKm: '', page: 1, pageSize: 20 };

  ngOnInit() {
    this.http.get<any>('/api/master/blood-groups').subscribe({
      next: (r) => { this.bloodGroups = r.data ?? r; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.search();
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => {
        const me = r.data ?? r;
        this.myId = me?.id || '';
        if (me?.latitude && this.filters.lat == null) {
          this.filters.lat = me.latitude;
          this.filters.lng = me.longitude;
          this.cdr.markForCheck();
        }
      },
      error: () => {},
    });
  }

  buildParams() {
    let p = new HttpParams();
    if (this.filters.bloodGroupId) p = p.set('bloodGroupId', this.filters.bloodGroupId);
    if (this.filters.city) p = p.set('city', this.filters.city);
    if (this.filters.area) p = p.set('area', this.filters.area);
    if (this.filters.pinCode) p = p.set('pinCode', this.filters.pinCode);
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
        this.errors.handleHttpError(e, 'Search failed');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  reset() {
    this.filters = { bloodGroupId: '', city: '', area: '', pinCode: '', lat: null, lng: null, radiusKm: '', page: 1, pageSize: 20 };
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.filters.lat = Number(pos.coords.latitude.toFixed(6));
        this.filters.lng = Number(pos.coords.longitude.toFixed(6));
        this.filters.radiusKm = '10';
        this.cdr.markForCheck();
        this.search();
      },
      () => this.errors.showWarn('Unable to get your location. Please allow location access.'),
    );
  }

  async thank(donor: any) {
    try {
      await firstValueFrom(
        this.http.post<any>('/api/appreciations', {
          receiverUserId: donor.id,
          message: 'Thank you for being a donor!',
        }),
      );
      this.errors.showSuccess(`Thanks sent to ${donor.displayName || donor.fullName || 'donor'}.`);
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to send thanks');
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
