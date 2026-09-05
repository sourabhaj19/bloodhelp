import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
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
        <div class="col-12 md:col-5 flex align-items-end gap-2">
          <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
          <p-button label="Near me" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()"></p-button>
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
          <tr><th>Name</th><th>Blood</th><th>Location</th><th>Distance</th><th>Contact</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td><p-avatar [label]="(d.displayName || d.fullName || '?').charAt(0)" shape="circle" styleClass="mr-2"></p-avatar><strong>{{ d.displayName || d.fullName }}</strong></td>
            <td><p-tag [value]="d.bloodGroup" severity="danger"></p-tag></td>
            <td>{{ d.city }}<span *ngIf="d.area"> · {{ d.area }}</span><div *ngIf="d.pinCode" class="muted text-sm">{{ d.pinCode }}</div></td>
            <td><span *ngIf="d.approxDistanceKm">~{{ d.approxDistanceKm }} km</span><span *ngIf="!d.approxDistanceKm" class="muted">—</span></td>
            <td>
              <span *ngIf="d.latitude" class="text-sm">{{ d.latitude | number: '1.4-4' }}, {{ d.longitude | number: '1.4-4' }}</span>
              <span *ngIf="!d.latitude" class="muted text-sm">Hidden</span>
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
    this.filters = { bloodGroupId: '', city: '', area: '', pinCode: '', lat: null, lng: null, radiusKm: '', page: 1, pageSize: 20 };
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
