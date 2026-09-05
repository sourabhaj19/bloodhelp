import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto" style="max-width: 720px">
      <h1 class="page-title">Profile</h1>
      <p class="page-sub">Keep your contact and location up to date so nearby seekers can find you.</p>

      <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
      <p-message *ngIf="message" severity="success" [text]="message" styleClass="w-full mb-3"></p-message>

      <p-card *ngIf="loading" header="Loading profile…">
        <p-skeleton height="2.5rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3, 4]"></p-skeleton>
      </p-card>

      <p-card *ngIf="!loading && profile" header="Personal details">
        <form (ngSubmit)="save()" #f="ngForm" class="formgrid grid">
          <div class="field col-12 md:col-6">
            <label for="fn">First name</label>
            <input pInputText id="fn" [(ngModel)]="profile.firstName" name="firstName" required class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="ln">Last name</label>
            <input pInputText id="ln" [(ngModel)]="profile.lastName" name="lastName" required class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="em">Email</label>
            <input pInputText id="em" [(ngModel)]="profile.email" name="email" type="email" required email class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="mo">Mobile</label>
            <input pInputText id="mo" [(ngModel)]="profile.mobile" name="mobile" required class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="area">Area</label>
            <input pInputText id="area" [(ngModel)]="profile.area" name="area" class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="pin">Pin code</label>
            <input pInputText id="pin" [(ngModel)]="profile.pinCode" name="pinCode" class="w-full" />
          </div>
          <div class="field col-6">
            <label for="lat">Latitude</label>
            <p-inputNumber inputId="lat" [(ngModel)]="profile.latitude" name="latitude" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full"></p-inputNumber>
          </div>
          <div class="field col-6">
            <label for="lng">Longitude</label>
            <p-inputNumber inputId="lng" [(ngModel)]="profile.longitude" name="longitude" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full"></p-inputNumber>
          </div>
          <div class="col-12 flex flex-wrap gap-2">
            <p-button type="button" label="Use my location" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()"></p-button>
            <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving" [disabled]="f.invalid || saving"></p-button>
          </div>
        </form>
      </p-card>

      <p-card *ngIf="!loading && profile" header="Account status" subheader="Inactive profiles are hidden from search" styleClass="mt-3">
        <div class="flex align-items-center justify-content-between">
          <span class="font-bold">Active donor</span>
          <p-inputSwitch [(ngModel)]="profile.active" (onChange)="toggleActive()"></p-inputSwitch>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  profile: any = null;
  loading = true;
  saving = false;
  message = '';
  error = '';

  ngOnInit() {
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => { this.profile = r.data ?? r; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load profile');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  useMyLocation() {
    if (!navigator.geolocation) {
      this.errors.showWarn('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.profile.latitude = Number(pos.coords.latitude.toFixed(6));
        this.profile.longitude = Number(pos.coords.longitude.toFixed(6));
        this.cdr.markForCheck();
        this.errors.showSuccess('Location updated. Remember to save.');
      },
      () => this.errors.showWarn('Unable to get your location.'),
    );
  }

  save() {
    this.saving = true;
    this.message = '';
    this.error = '';
    const payload: any = {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      email: this.profile.email,
      mobile: this.profile.mobile,
      area: this.profile.area,
      pinCode: this.profile.pinCode,
      latitude: Number(this.profile.latitude),
      longitude: Number(this.profile.longitude),
    };
    this.http.patch<any>('/api/users/me', payload).subscribe({
      next: (r) => {
        this.profile = r.data ?? r;
        this.message = 'Profile saved.';
        this.errors.showSuccess('Profile saved.');
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Save failed');
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive() {
    this.http.patch<any>('/api/users/me/status', { active: this.profile.active }).subscribe({
      next: () => {
        this.message = 'Status updated.';
        this.errors.showSuccess(this.profile.active ? 'Profile is now visible to seekers.' : 'Profile hidden from search.');
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.profile.active = !this.profile.active;
        this.errors.handleHttpError(e, 'Status update failed');
        this.cdr.markForCheck();
      },
    });
  }
}
