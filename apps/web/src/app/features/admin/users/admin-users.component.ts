import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { DonorMapComponent } from '../../../shared/components/donor-map.component';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule, DonorMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Users</h1>
    <p class="page-sub">Manage donor and admin accounts.</p>

    <p-card styleClass="mb-3">
      <div class="flex gap-2">
        <p-iconField iconPosition="left" styleClass="w-full">
          <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
          <input pInputText [(ngModel)]="search" placeholder="Search email / name / mobile" class="w-full" (keyup.enter)="onSearch()" />
        </p-iconField>
        <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
        <p-button label="View all on map" icon="pi pi-map" severity="secondary" [outlined]="true" (onClick)="showAllOnMap()" [disabled]="loading || mappableCount === 0" pTooltip="Open all user pins in the map"></p-button>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading users…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading && result" header="Results" [subheader]="result.total + ' user(s)'">
      <p-table [value]="result.items ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Map</th><th style="width: 220px">Actions</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-u>
          <tr>
            <td><strong>{{ u.firstName }} {{ u.lastName }}</strong></td>
            <td>{{ u.email }}</td>
            <td><p-tag [value]="u.role" [severity]="u.role === 'ADMIN' ? 'danger' : 'info'"></p-tag></td>
            <td><p-tag [value]="u.active ? 'Active' : 'Inactive'" [severity]="u.active ? 'success' : 'warning'"></p-tag></td>
            <td>
              <p-button
                *ngIf="u.latitude != null && u.longitude != null"
                label="View on map"
                icon="pi pi-map-marker"
                size="small"
                severity="secondary"
                [outlined]="true"
                (onClick)="focusOnMap(u)">
              </p-button>
              <span *ngIf="u.latitude == null || u.longitude == null" class="muted text-sm">—</span>
            </td>
            <td>
              <div class="flex gap-2">
                <p-button [label]="u.active ? 'Deactivate' : 'Activate'" size="small" severity="secondary" [outlined]="true" (onClick)="toggle(u)"></p-button>
                <p-button label="Delete" size="small" severity="danger" [outlined]="true" (onClick)="askRemove(u)"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center muted">No users found.</td></tr>
        </ng-template>
      </p-table>
      <p-paginator
        [rows]="pageSize"
        [totalRecords]="result.total ?? 0"
        [rowsPerPageOptions]="[10, 20, 50]"
        [first]="(page - 1) * pageSize"
        (onPageChange)="onPage($event)"
        styleClass="mt-3">
      </p-paginator>
    </p-card>

    <p-dialog [(visible)]="mapDialog" [modal]="true" [dismissableMask]="true" [draggable]="false"
      [style]="{ width: 'min(900px, 96vw)' }" [header]="mapDialogTitle"
      (onShow)="onMapDialogShow()" (onHide)="onMapDialogHide()">
      <app-donor-map *ngIf="mapDialog"
        [donors]="mapDialogDonors"
        [centerLat]="null"
        [centerLng]="null"
        [focusId]="focusedUserId"
        [height]="420">
      </app-donor-map>
      <div class="flex align-items-center gap-2 mt-2 flex-wrap">
        <span class="muted text-sm">📍 {{ mapDialogPlotted }} plotted · OpenStreetMap</span>
        <span class="flex-grow-1"></span>
        <p-button *ngIf="mapDialogMode === 'single'" label="Show all pins" icon="pi pi-map" size="small" severity="secondary" [outlined]="true" (onClick)="dialogShowAll()"></p-button>
      </div>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .muted { color: #98a2b3; }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  search = '';
  loading = false;
  error = '';
  result: any = null;
  page = 1;
  pageSize = 20;

  @ViewChild(DonorMapComponent) donorMap?: DonorMapComponent;

  // ── Map dialog (modal) state — same pattern as the donor search page ──
  mapDialog = false;
  mapDialogMode: 'single' | 'all' = 'all';
  mapDialogDonor: any = null;
  // Stored as a field (not a getter): a new array identity every CD cycle
  // would retrigger the map's ngOnChanges endlessly.
  mapDialogDonors: any[] = [];
  focusedUserId: string | null = null;

  /** Admin DTO carries relation objects — flatten to the pin shape the map uses. */
  private toMapDonor(u: any): any {
    return {
      id: u.id,
      displayName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'User',
      bloodGroup: u.bloodGroup?.code ?? u.bloodGroup ?? null,
      city: u.city?.name ?? u.city ?? null,
      area: u.area,
      latitude: u.latitude,
      longitude: u.longitude,
    };
  }

  private hasCoords(u: any): boolean {
    const lat = Number(u?.latitude);
    const lng = Number(u?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  get mappableCount(): number {
    return (this.result?.items ?? []).filter((u: any) => this.hasCoords(u)).length;
  }

  get mapDialogTitle(): string {
    if (this.mapDialogMode === 'single' && this.mapDialogDonor) {
      return `${this.mapDialogDonor.displayName} — on map`;
    }
    return `User map (${this.mapDialogPlotted} plotted)`;
  }

  get mapDialogPlotted(): number {
    return (this.mapDialogDonors ?? []).filter((d: any) => this.hasCoords(d)).length;
  }

  /** Per-row "View on map" — open the modal focused on one user. */
  focusOnMap(u: any) {
    if (!this.hasCoords(u)) return;
    const pin = this.toMapDonor(u);
    this.mapDialogMode = 'single';
    this.mapDialogDonor = pin;
    this.mapDialogDonors = [pin];
    this.focusedUserId = String(u.id);
    this.mapDialog = true;
    this.cdr.markForCheck();
  }

  /** "View all on map" — open the modal with every pin from current results. */
  showAllOnMap() {
    if (this.mappableCount === 0) {
      this.errors.showWarn('No user pins to show for the current results.');
      return;
    }
    this.mapDialogMode = 'all';
    this.mapDialogDonor = null;
    this.mapDialogDonors = (this.result?.items ?? []).map((u: any) => this.toMapDonor(u));
    this.focusedUserId = null;
    this.mapDialog = true;
    this.cdr.markForCheck();
  }

  /** Fired once the dialog is visible (has real size) — drive the map. */
  onMapDialogShow() {
    // The map child may still be loading the Leaflet chunk — focusDonor/showAll
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
    this.focusedUserId = null;
  }

  /** Inside the dialog: switch from single-pin to all-pins view. */
  dialogShowAll() {
    this.mapDialogMode = 'all';
    this.mapDialogDonor = null;
    this.mapDialogDonors = (this.result?.items ?? []).map((u: any) => this.toMapDonor(u));
    this.focusedUserId = null;
    this.cdr.markForCheck();
    setTimeout(() => this.donorMap?.showAll(), 120);
  }

  ngOnInit() { this.load(); }

  onSearch() {
    this.page = 1;
    this.load();
  }

  onPage(e: any) {
    this.page = e.page + 1;
    this.pageSize = e.rows;
    this.load();
  }

  load() {
    let params = new HttpParams().set('page', String(this.page)).set('pageSize', String(this.pageSize));
    if (this.search.trim()) params = params.set('search', this.search.trim());
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/admin/users', { params }).subscribe({
      next: (r) => {
        this.result = r.data ?? r;
        // Drop pin focus if the focused user is no longer in the results.
        const ids = new Set((this.result?.items ?? []).map((u: any) => String(u?.id)));
        if (this.focusedUserId && !ids.has(String(this.focusedUserId))) {
          this.focusedUserId = null;
          this.donorMap?.clearFocus();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load users');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggle(u: any) {
    this.http.patch<any>(`/api/admin/users/${u.id}/status`, { active: !u.active }).subscribe({
      next: () => {
        this.errors.showSuccess(`User ${!u.active ? 'activated' : 'deactivated'}.`);
        this.load();
      },
      error: (e) => this.errors.handleHttpError(e, 'Status update failed'),
    });
  }

  askRemove(u: any) {
    this.confirm.confirm({
      message: `Soft-delete user ${u.email}? They will be hidden from search.`,
      header: 'Delete user',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/admin/users/${u.id}`).subscribe({
          next: () => {
            this.errors.showSuccess('User deleted.');
            this.load();
          },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }
}
