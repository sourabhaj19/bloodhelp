import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
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
          <p-inputSwitch [(ngModel)]="profile.active" (onChange)="askToggleActive()"></p-inputSwitch>
        </div>
        <p-message *ngIf="isEmailChanged() || isMobileChanged()" severity="warn" text="Changing email or mobile will require re-verification." styleClass="w-full mb-3"></p-message>
        <form (ngSubmit)="save()" #f="ngForm" class="formgrid grid">
          <div class="field col-12 md:col-6">
            <label for="fn">First name</label>
            <input pInputText id="fn" [(ngModel)]="profile.firstName" name="firstName" required maxlength="100" class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="ln">Last name</label>
            <input pInputText id="ln" [(ngModel)]="profile.lastName" name="lastName" required maxlength="100" class="w-full" />
          </div>
          <div class="field col-12 md:col-6">
            <label for="em">Email</label>
            <input pInputText id="em" [(ngModel)]="profile.email" name="email" type="email" required email maxlength="254" class="w-full" #emailCtrl="ngModel" />
            <small class="p-error" *ngIf="emailCtrl.invalid && emailCtrl.touched">Enter a valid email address</small>
          </div>
          <div class="field col-12 md:col-6">
            <label for="mo">Mobile</label>
            <input pInputText id="mo" [(ngModel)]="profile.mobile" name="mobile" required inputmode="numeric" maxlength="10" minlength="10" pattern="[0-9]{10}" class="w-full" #mobileCtrl="ngModel" (ngModelChange)="onMobileInput($event)" />
            <small class="p-error" *ngIf="mobileCtrl.invalid && mobileCtrl.touched">Enter a valid 10-digit mobile number</small>
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
            <input pInputText id="area" [(ngModel)]="profile.area" name="area" required maxlength="200" class="w-full" #areaCtrl="ngModel" />
            <small class="p-error" *ngIf="areaCtrl.invalid && areaCtrl.touched">Area is required (max 200)</small>
          </div>
          <div class="field col-12 md:col-6">
            <label for="pin">Pin code</label>
            <input pInputText id="pin" [(ngModel)]="profile.pinCode" name="pinCode" required inputmode="numeric" maxlength="6" minlength="6" pattern="[0-9]{6}" class="w-full" #pinCtrl="ngModel" />
            <small class="p-error" *ngIf="pinCtrl.invalid && pinCtrl.touched">Enter a valid 6-digit pin code</small>
          </div>
          <div class="col-12 flex flex-wrap gap-2">
            <p-button type="button" label="Use my location" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()"></p-button>
            <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving" [disabled]="f.invalid || !mobileValid() || !pinValid() || saving"></p-button>
          </div>
        </form>
      </p-card>

      <p-dialog [(visible)]="otpDialog" header="Enter verification code" [modal]="true" [style]="{ width: 'min(400px, 94vw)' }">
        <p class="mt-0">We sent a 6-digit code to <strong>{{ profile?.mobile }}</strong>. It expires in 10 minutes.</p>
        <p-message *ngIf="devOtp && isDevMode" severity="info" [text]="'Dev mode — your code is ' + devOtp" styleClass="w-full mb-3"></p-message>
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
      <p-confirmDialog></p-confirmDialog>
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
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  emailSending = false;
  otpDialog = false;
  otp = '';
  otpError = '';
  otpVerifying = false;
  devOtp = '';

  profile: any = null;
  private originalEmail = '';
  private originalMobile = '';
  loading = true;
  saving = false;
  message = '';
  error = '';

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  get isDevMode(): boolean {
    try {
      const h = typeof window !== 'undefined' ? window.location.hostname : '';
      return h === 'localhost' || h === '127.0.0.1';
    } catch { return false; }
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => {
        this.profile = r.data ?? r;
        this.originalEmail = this.profile?.email ?? '';
        this.originalMobile = this.profile?.mobile ?? '';
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

  isEmailChanged(): boolean { return this.profile && this.originalEmail && this.profile.email !== this.originalEmail; }
  isMobileChanged(): boolean { return this.profile && this.originalMobile && String(this.profile.mobile ?? '').replace(/\D/g,'') !== String(this.originalMobile ?? '').replace(/\D/g,''); }

  onMobileInput(value: string) {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 10);
    if (digits !== this.profile.mobile) this.profile.mobile = digits;
  }
  mobileValid(): boolean { return /^[0-9]{10}$/.test(String(this.profile?.mobile ?? '')); }
  pinValid(): boolean { return /^[0-9]{6}$/.test(String(this.profile?.pinCode ?? '').trim()); }

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
    if (typeof window !== 'undefined' && (window as any).isSecureContext === false) {
      this.errors.showWarn('Geolocation needs https or localhost. Please pick on map or save manually.');
      return;
    }
    const onSuccess = (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy;
      this.profile.latitude = Number(pos.coords.latitude.toFixed(6));
      this.profile.longitude = Number(pos.coords.longitude.toFixed(6));
      this.cdr.markForCheck();
      if (acc != null && acc > 1000) this.errors.showWarn(`Location captured but low accuracy (±${Math.round(acc)} m). Drag pin on map or save anyway.`);
      else if (acc != null && acc > 200) this.errors.showInfo(`Location captured (±${Math.round(acc)} m). Remember to save.`);
      else this.errors.showSuccess(`Location updated (±${acc != null ? Math.round(acc) + ' m' : 'high accuracy'}). Remember to save.`);
    };
    const onLowFail = (err: GeolocationPositionError) => {
      const c = (err as any)?.code;
      if (c === 1) this.errors.showWarn('Location permission denied — allow or pick on map.');
      else if (c === 3) this.errors.showWarn('Location timed out. Try outdoors or use map picker.');
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

  save() {
    if (!this.mobileValid()) { this.error = 'Enter a valid 10-digit mobile number.'; this.cdr.markForCheck(); return; }
    if (!this.pinValid()) { this.error = 'Enter a valid 6-digit pin code.'; this.cdr.markForCheck(); return; }
    this.saving = true;
    this.message = '';
    this.error = '';
    const payload: any = {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      email: this.profile.email,
      mobile: String(this.profile.mobile ?? '').replace(/\D/g,'').slice(0,10),
      countryId: this.profile.countryId,
      stateId: this.profile.stateId,
      cityId: this.profile.cityId,
      area: this.profile.area,
      pinCode: String(this.profile.pinCode ?? '').trim(),
      latitude: Number(this.profile.latitude),
      longitude: Number(this.profile.longitude),
    };
    this.http.patch<any>('/api/users/me', payload).subscribe({
      next: (r) => {
        this.profile = r.data ?? r;
        this.originalEmail = this.profile?.email ?? this.originalEmail;
        this.originalMobile = this.profile?.mobile ?? this.originalMobile;
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

  askToggleActive() {
    const willBeActive = this.profile.active;
    const action = willBeActive ? 'make your profile visible to seekers' : 'hide your profile from search';
    // p-inputSwitch already flipped the value — we need to confirm, revert if cancelled
    this.confirm.confirm({
      message: `Are you sure you want to ${action}?`,
      header: willBeActive ? 'Activate profile' : 'Hide profile',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: willBeActive ? 'p-button-success' : 'p-button-warning',
      accept: () => this.toggleActive(),
      reject: () => {
        this.profile.active = !willBeActive;
        this.cdr.markForCheck();
      },
    });
  }

  private toggleActive() {
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
