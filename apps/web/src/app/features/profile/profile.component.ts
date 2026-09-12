import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  selector: 'app-profile-editor',
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

      <p-card *ngIf="!loading && profile" header="Verification" subheader="Verified contact details keep the community trustworthy" styleClass="mb-3">
        <div class="flex flex-column gap-3">
          <div class="flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>
              <div class="font-bold">Email</div>
              <div class="muted text-sm">{{ profile.email }}</div>
            </div>
            <div class="flex align-items-center gap-2">
              <p-tag *ngIf="profile.emailVerified" value="Verified" severity="success" icon="pi pi-check"></p-tag>
              <p-button *ngIf="!profile.emailVerified" label="Send verification link" size="small" severity="secondary" [outlined]="true" (onClick)="resendEmail()" [loading]="emailSending"></p-button>
            </div>
          </div>
          <p-divider styleClass="m-0"></p-divider>
          <div class="flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>
              <div class="font-bold">Mobile</div>
              <div class="muted text-sm">{{ profile.mobile }}</div>
            </div>
            <div class="flex align-items-center gap-2">
              <p-tag *ngIf="profile.mobileVerified" value="Verified" severity="success" icon="pi pi-check"></p-tag>
              <p-button *ngIf="!profile.mobileVerified" label="Verify via SMS" icon="pi pi-mobile" size="small" severity="secondary" [outlined]="true" (onClick)="sendOtp()"></p-button>
            </div>
          </div>
        </div>
      </p-card>

      <p-card *ngIf="!loading && profile" header="Personal details">
        <div class="flex align-items-center justify-content-between mb-3 px-3 py-2 border-round" style="background: #f9fafb">
          <span class="font-bold">Active donor <span class="muted text-sm font-normal">— visible in search</span></span>
          <p-inputSwitch [(ngModel)]="profile.active" (onChange)="toggleActive()"></p-inputSwitch>
        </div>
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
            <label for="country">Country</label>
            <p-dropdown inputId="country" [(ngModel)]="profile.countryId" name="countryId" [options]="countries" optionLabel="name" optionValue="id" placeholder="Select country" [filter]="true" [appendTo]="'body'" (onChange)="onCountryChange()" styleClass="w-full" required></p-dropdown>
          </div>
          <div class="field col-12 md:col-6">
            <label for="state">State</label>
            <p-dropdown inputId="state" [(ngModel)]="profile.stateId" name="stateId" [options]="states" optionLabel="name" optionValue="id" placeholder="Select state" [filter]="true" [appendTo]="'body'" [disabled]="!profile.countryId" (onChange)="onStateChange()" styleClass="w-full" required></p-dropdown>
          </div>
          <div class="field col-12 md:col-6">
            <label for="city">City</label>
            <p-dropdown inputId="city" [(ngModel)]="profile.cityId" name="cityId" [options]="cities" optionLabel="name" optionValue="id" placeholder="Select city" [filter]="true" [appendTo]="'body'" [disabled]="!profile.stateId" styleClass="w-full" required></p-dropdown>
          </div>
          <div class="field col-12 md:col-6">
            <label for="area">Area</label>
            <input pInputText id="area" [(ngModel)]="profile.area" name="area" class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="pin">Pin code</label>
            <input pInputText id="pin" [(ngModel)]="profile.pinCode" name="pinCode" class="w-full" />
          </div>
          <div class="col-12 flex flex-wrap gap-2">
            <p-button type="button" label="Use my location" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()"></p-button>
            <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving" [disabled]="f.invalid || saving"></p-button>
          </div>
        </form>
      </p-card>

      <p-dialog [(visible)]="otpDialog" header="Enter verification code" [modal]="true" [style]="{ width: 'min(400px, 94vw)' }">
        <p class="mt-0">We sent a 6-digit code to <strong>{{ profile?.mobile }}</strong>. It expires in 10 minutes.</p>
        <p-message *ngIf="devOtp" severity="info" [text]="'Dev mode — your code is ' + devOtp" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="otpError" severity="error" [text]="otpError" styleClass="w-full mb-3"></p-message>
        <div class="field mb-0">
          <label for="otp">6-digit code</label>
          <input pInputText id="otp" [(ngModel)]="otp" maxlength="6" inputmode="numeric" class="w-full otp-input" placeholder="••••••" autocomplete="one-time-code" />
        </div>
        <div class="flex align-items-center justify-content-between mt-3">
          <p-button label="Resend code" severity="secondary" [text]="true" size="small" (onClick)="sendOtp()"></p-button>
          <p-button label="Verify" icon="pi pi-check" (onClick)="confirmOtp()" [loading]="otpVerifying" [disabled]="otp.trim().length !== 6"></p-button>
        </div>
      </p-dialog>
    </div>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .muted { color: #667085; }
      .otp-input { letter-spacing: 0.5em; text-align: center; font-size: 1.3rem; font-weight: 700; }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  emailSending = false;
  otpDialog = false;
  otp = '';
  otpError = '';
  otpVerifying = false;
  devOtp = '';

  profile: any = null;
  loading = true;
  saving = false;
  message = '';
  error = '';

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => {
        this.profile = r.data ?? r;
        this.loading = false;
        this.loadLocationMasters();
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load profile');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Same cascading behaviour as registration: country → states → cities. */
  loadLocationMasters() {
    this.http.get<any>('/api/master/countries').subscribe({
      next: (r) => {
        this.countries = r.data ?? r ?? [];
        // Preserve profile's existing selection, just load its dependents.
        if (this.profile?.countryId) this.loadStates(true);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  private loadStates(preserveSelection = false) {
    if (!preserveSelection) {
      this.states = [];
      this.cities = [];
    }
    if (!this.profile?.countryId) {
      if (!preserveSelection) this.cdr.markForCheck();
      return;
    }
    this.http.get<any>(`/api/master/countries/${this.profile.countryId}/states`).subscribe({
      next: (r) => {
        this.states = r.data ?? r ?? [];
        if (this.profile?.stateId) this.loadCities(true);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  private loadCities(preserveSelection = false) {
    if (!preserveSelection) this.cities = [];
    if (!this.profile?.stateId) {
      if (!preserveSelection) this.cdr.markForCheck();
      return;
    }
    this.http.get<any>(`/api/master/states/${this.profile.stateId}/cities`).subscribe({
      next: (r) => { this.cities = r.data ?? r ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  onCountryChange() {
    this.profile.stateId = '';
    this.profile.cityId = '';
    this.loadStates();
  }

  onStateChange() {
    this.profile.cityId = '';
    this.loadCities();
  }

  async resendEmail() {
    this.emailSending = true;
    try {
      await this.auth.resendVerification();
      this.errors.showSuccess('Verification link sent — check your inbox.');
    } catch (e: any) {
      this.errors.handleHttpError(e, 'Failed to send verification email');
    } finally {
      this.emailSending = false;
      this.cdr.markForCheck();
    }
  }

  async sendOtp() {
    this.otpError = '';
    try {
      const res: any = await this.auth.sendMobileOtp();
      const data = res?.data ?? res;
      this.devOtp = data?.devOtp || '';
      this.otp = '';
      this.otpDialog = true;
      if (!this.devOtp) this.errors.showInfo('Code sent by SMS.');
    } catch (e: any) {
      this.errors.handleHttpError(e, 'Failed to send code');
    } finally {
      this.cdr.markForCheck();
    }
  }

  async confirmOtp() {
    if (this.otp.trim().length !== 6) return;
    this.otpError = '';
    this.otpVerifying = true;
    try {
      await this.auth.verifyMobile(this.otp.trim());
      this.otpDialog = false;
      this.devOtp = '';
      this.errors.showSuccess('Mobile number verified.');
      this.loadProfile();
    } catch (e: any) {
      this.otpError = this.errors.getUserMessage(e);
    } finally {
      this.otpVerifying = false;
      this.cdr.markForCheck();
    }
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
      countryId: this.profile.countryId,
      stateId: this.profile.stateId,
      cityId: this.profile.cityId,
      area: this.profile.area,
      pinCode: this.profile.pinCode,
      latitude: Number(this.profile.latitude),
      longitude: Number(this.profile.longitude),
    };
    this.http.patch<any>('/api/users/me', payload).subscribe({
      next: (r) => {
        this.profile = r.data ?? r;
        // Refresh dependents in case IDs changed server-side.
        this.loadLocationMasters();
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
