import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { SharedUiModule } from '../../shared/shared-ui.module';

declare const L: any;

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-shell">
      <p-card styleClass="register-card-ui">
        <div class="text-center mb-3">
          <span class="brand-badge"><i class="pi pi-heart-fill"></i></span>
          <h1 class="auth-title">Become a donor</h1>
          <p class="auth-sub">Create your BloodHelp account. All fields are required.</p>
        </div>

        <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="success" severity="success" text="Registered! Redirecting…" styleClass="w-full mb-3"></p-message>

        <form (ngSubmit)="openLocationDialog(regForm)" #regForm="ngForm">
          <div class="formgrid grid">
            <div class="field col-12 md:col-6">
              <label for="firstName">First name</label>
              <input pInputText id="firstName" [(ngModel)]="form.firstName" name="firstName" required maxlength="100" class="w-full" autocomplete="given-name" />
            </div>
            <div class="field col-12 md:col-6">
              <label for="lastName">Last name</label>
              <input pInputText id="lastName" [(ngModel)]="form.lastName" name="lastName" required maxlength="100" class="w-full" autocomplete="family-name" />
            </div>
            <div class="field col-12 md:col-6">
              <label for="dob">Date of birth</label>
              <p-calendar
                inputId="dob"
                [(ngModel)]="dob"
                name="dateOfBirth"
                dateFormat="yy-mm-dd"
                [showIcon]="true"
                [minDate]="minDob"
                [maxDate]="maxDob"
                placeholder="Select your DOB"
                styleClass="dob-calendar"
                required
                #dobCtrl="ngModel"
              ></p-calendar>
              <small class="hint">Age must be 18–65 years</small>
              <small class="p-error" *ngIf="dobCtrl.invalid && dobCtrl.touched">Select your date of birth</small>
              <small class="p-error" *ngIf="dob && !isDobValid()">Age must be 18–65 years to donate</small>
            </div>
            <div class="field col-12 md:col-6">
              <label for="bloodGroup">Blood group</label>
              <p-dropdown
                inputId="bloodGroup"
                [(ngModel)]="form.bloodGroupId"
                name="bloodGroupId"
                [options]="bloodGroups"
                optionLabel="label"
                optionValue="id"
                placeholder="Select blood group"
                [filter]="true"
                [appendTo]="'body'"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>

            <div class="field col-12 md:col-6">
              <label for="email">Email</label>
              <input pInputText id="email" [(ngModel)]="form.email" name="email" type="email" required email maxlength="254" class="w-full" placeholder="user@example.com" autocomplete="email" #emailCtrl="ngModel" />
              <small class="p-error" *ngIf="emailCtrl.invalid && emailCtrl.touched">
                Enter a valid email address
              </small>
            </div>
            <div class="field col-12 md:col-6">
              <label for="password">Password</label>
              <p-password
                [(ngModel)]="form.password"
                name="password"
                inputId="password"
                required
                minlength="8"
                maxlength="128"
                pattern="^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$"
                placeholder="Min. 8 characters"
                [toggleMask]="true"
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                autocomplete="new-password"
                #passwordCtrl="ngModel"
              ></p-password>
              <small class="hint">8+ characters with one uppercase &amp; one special character</small>
              <small class="p-error" *ngIf="passwordCtrl.invalid && passwordCtrl.touched">
                Password needs 8+ characters: one uppercase &amp; one special character
              </small>
            </div>

            <div class="field col-12 md:col-6">
              <label for="country">Country</label>
              <p-dropdown
                inputId="country"
                [(ngModel)]="form.countryId"
                name="countryId"
                [options]="countries"
                optionLabel="name"
                optionValue="id"
                placeholder="Select country"
                [filter]="true"
                [appendTo]="'body'"
                (onChange)="onCountryChange()"
                styleClass="w-full"
                required
              ></p-dropdown>
              <small class="hint" *ngIf="dialPrefix">Dial code {{ dialPrefix }} applied automatically</small>
            </div>
            <div class="field col-12 md:col-6">
              <label for="mobile">Mobile number</label>
              <div class="mobile-wrap">
                <span class="dial-prefix" *ngIf="dialPrefix">{{ dialPrefix }}</span>
                <input
                  pInputText
                  id="mobile"
                  [(ngModel)]="form.mobile"
                  name="mobile"
                  required
                  class="w-full mobile-input"
                  placeholder="9876543210"
                  inputmode="numeric"
                  autocomplete="tel-national"
                  maxlength="10"
                  minlength="10"
                  pattern="[0-9]{10}"
                  #mobileCtrl="ngModel"
                  (ngModelChange)="onMobileInput($event)"
                />
              </div>
              <small class="p-error" *ngIf="mobileCtrl.invalid && mobileCtrl.touched">
                Enter a valid 10-digit mobile number
              </small>
            </div>

            <div class="field col-12 md:col-6">
              <label for="state">State</label>
              <p-dropdown
                inputId="state"
                [(ngModel)]="form.stateId"
                name="stateId"
                [options]="states"
                optionLabel="name"
                optionValue="id"
                placeholder="Select state"
                [filter]="true"
                [appendTo]="'body'"
                [disabled]="!form.countryId"
                (onChange)="onStateChange()"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-6">
              <label for="city">City</label>
              <p-dropdown
                inputId="city"
                [(ngModel)]="form.cityId"
                name="cityId"
                [options]="cities"
                optionLabel="name"
                optionValue="id"
                placeholder="Select city"
                [filter]="true"
                [appendTo]="'body'"
                [disabled]="!form.stateId"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-6">
              <label for="area">Area</label>
              <input pInputText id="area" [(ngModel)]="form.area" name="area" required maxlength="200" class="w-full" placeholder="Street / locality" />
            </div>
            <div class="field col-12 md:col-6">
              <label for="pin">Pin code</label>
              <input
                pInputText
                id="pin"
                [(ngModel)]="form.pinCode"
                name="pinCode"
                required
                class="w-full"
                placeholder="400001"
                inputmode="numeric"
                maxlength="6"
                minlength="6"
                pattern="[0-9]{6}"
                #pinCtrl="ngModel"
              />
              <small class="p-error" *ngIf="pinCtrl.invalid && pinCtrl.touched">
                Enter a valid 6-digit pin code
              </small>
            </div>
          </div>

          <p-button
            type="submit"
            label="Create account"
            icon="pi pi-check"
            [disabled]="regForm.invalid || !mobileValid() || loading"
            styleClass="w-full mt-3"
          ></p-button>
        </form>

        <p class="text-center mt-3 mb-0">
          Already have an account? <a routerLink="/login" class="link font-bold">Log in</a>
        </p>
      </p-card>

      <!-- Location: two options only — GPS or pick on map -->
      <p-dialog
        [(visible)]="locationDialog"
        header="Share your location"
        [modal]="true"
        [dismissableMask]="true"
        [draggable]="false"
        appendTo="body"
        [baseZIndex]="1100"
        [autoZIndex]="true"
        [keepInViewport]="true"
        [blockScroll]="true"
        [resizable]="false"
        [contentStyle]="{'overflow':'auto'}"
        [style]="{ width: 'min(560px, 96vw)' }"
        (onHide)="onLocationDialogHide()"
      >
        <p class="mt-0 consent-text">
          BloodHelp matches donors by distance, so we need your location. Choose GPS for fastest, or pick your location directly on the map.
        </p>

        <p-message *ngIf="locationError" severity="error" [text]="locationError" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="locationCaptured" severity="success" [text]="'Location captured: ' + form.latitude + ', ' + form.longitude + (locationAccuracy ? ' (±' + locationAccuracy + 'm)' : '') + ' — you can now create your account!'" styleClass="w-full mb-3"></p-message>
        <p-message *ngIf="locationCaptured && locationAccuracy && locationAccuracy > 500" severity="warn" text="Accuracy is low — please drag the pin on the map to your exact location for better donor matching." styleClass="w-full mb-3"></p-message>

        <div *ngIf="locating" class="flex align-items-center gap-2 mb-3">
          <p-progressSpinner [style]="{ width: '28px', height: '28px' }" strokeWidth="5"></p-progressSpinner>
          <span class="muted">Getting your location… (this may take a few seconds for high accuracy)</span>
        </div>

        <div class="flex flex-column gap-2">
          <p-button
            type="button"
            label="Use my GPS location"
            icon="pi pi-map-marker"
            [loading]="locating"
            [disabled]="locating || loading"
            (onClick)="useMyLocation()"
            styleClass="w-full"
          ></p-button>
          <small class="hint text-center">Fastest — uses your device GPS. Allow permission when prompted.</small>

          <p-divider layout="horizontal" align="center"><span class="muted text-xs" style="color:#98a2b3">or</span></p-divider>

          <p-button
            type="button"
            [label]="showMapPicker ? 'Hide map picker' : 'Pick location on map'"
            icon="pi pi-map"
            severity="secondary"
            [outlined]="true"
            (onClick)="toggleMapPicker()"
            styleClass="w-full"
          ></p-button>

          <div *ngIf="showMapPicker" class="pick-map-wrap mt-2">
            <div #pickMapEl class="pick-map"></div>
            <small class="hint">Click anywhere on the map to set your precise location. Click again to adjust. You can also drag the pin.</small>
            <small *ngIf="locationCaptured" class="captured-coords">Selected: {{ form.latitude }}, {{ form.longitude }}<span *ngIf="locationAccuracy"> (±{{ locationAccuracy }}m)</span></small>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="locationDialog = false"></p-button>
          <p-button
            label="Confirm & create account"
            icon="pi pi-check"
            [loading]="loading"
            [disabled]="!locationCaptured || loading"
            (onClick)="confirmAndRegister()"
          ></p-button>
        </ng-template>
      </p-dialog>
    </main>
  `,
  styles: [
    `
      .register-card-ui { width: min(760px, 96vw); }
      :host ::ng-deep .register-card-ui { border-radius: 18px; }
      :host ::ng-deep .register-card-ui .p-card-body { padding: 1.75rem; }
      .brand-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 52px; height: 52px; border-radius: 16px;
        background: rgba(180, 35, 24, 0.1); color: #b42318; font-size: 1.5rem;
      }
      .auth-title { margin: 0.6rem 0 0.15rem; font-size: 1.7rem; letter-spacing: -0.02em; }
      .auth-sub { margin: 0; color: #667085; }
      .field label { display: block; margin-bottom: 0.4rem; }
      .hint { color: #98a2b3; }
      .link { color: #b42318; font-weight: 600; }
      .link:hover { text-decoration: underline; }
      .mobile-wrap { display: flex; align-items: stretch; }
      .dial-prefix {
        display: inline-flex; align-items: center; padding: 0 0.75rem;
        background: #f2f4f7; border: 1px solid #d0d5dd; border-right: none;
        border-radius: 6px 0 0 6px; color: #344054; font-weight: 600; white-space: nowrap;
      }
      .mobile-wrap .mobile-input { border-radius: 0 6px 6px 0 !important; }
      .consent-text { color: #475467; line-height: 1.55; }
      .muted { color: #667085; font-size: 0.9rem; }
      :host ::ng-deep .dob-calendar { display: flex; width: 100%; }
      :host ::ng-deep .dob-calendar .p-inputtext { flex: 1 1 auto; width: 1%; min-width: 0; }
      :host ::ng-deep .dob-calendar.p-calendar-w-btn .p-inputtext {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      :host ::ng-deep .dob-calendar.p-calendar-w-btn .p-datepicker-trigger {
        flex: 0 0 auto;
        margin: 0;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
      }
      .pick-map-wrap {
        border: 1px solid #eaecf0;
        border-radius: 12px;
        overflow: hidden;
        background: #f9fafb;
        padding: 0;
      }
      .pick-map {
        width: 100%;
        height: 260px;
        background: #f2f4f7;
        z-index: 0;
      }
      .pick-map-wrap .hint { display: block; padding: 0.5rem 0.75rem 0.25rem; }
      .captured-coords {
        display: block;
        padding: 0 0.75rem 0.6rem;
        color: #067647;
        font-weight: 600;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class RegisterComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('pickMapEl') pickMapEl?: ElementRef<HTMLDivElement>;

  bloodGroups: any[] = [];
  countryCodes: any[] = [];
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  loading = false;
  error = '';
  success = false;
  dob: Date | null = null;
  maxDob: Date = new Date();
  minDob: Date = new Date();

  // Location consent state — lat/long are mandatory, captured via GPS or map picker.
  locationDialog = false;
  locating = false;
  locationCaptured = false;
  locationError = '';
  locationAccuracy: number | null = null;

  showMapPicker = false;
  private pickMap: any = null;
  private pickMarker: any = null;

  form: any = {
    firstName: '',
    lastName: '',
    email: '',
    countryCodeId: '',
    mobile: '',
    password: '',
    bloodGroupId: '',
    countryId: '',
    stateId: '',
    cityId: '',
    area: '',
    pinCode: '',
    latitude: 19.076,
    longitude: 72.8777,
  };

  ngOnInit() {
    this.computeDobBounds();
    this.loadMaster();
  }

  private computeDobBounds() {
    const today = new Date();
    // must be at least 18 years old → max DOB = today - 18y
    // must be at most 65 years old → min DOB = today - 65y
    this.maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    this.minDob = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
  }

  private getAge(d: Date): number {
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }

  isDobValid(): boolean {
    if (!this.dob) return false;
    const age = this.getAge(this.dob);
    return age >= 18 && age <= 65;
  }

  get isDirty(): boolean {
    if (this.success) return false;
    const f = this.form;
    return !!(f.firstName?.trim() || f.lastName?.trim() || f.email?.trim() || f.mobile?.trim() || f.area?.trim() || f.pinCode?.trim() || this.dob || f.bloodGroupId);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  canDeactivate(): boolean {
    if (!this.isDirty) return true;
    return confirm('You have unsaved changes — leave this page?');
  }

  /** Dial code derived from the selected country — no manual input needed. */
  get dialPrefix(): string {
    const match = this.countryCodes.find((c) => c.countryId && c.countryId === this.form.countryId);
    if (match?.dialCode) return match.dialCode;
    if (this.countryCodes[0]?.dialCode) return this.countryCodes[0].dialCode;
    return '';
  }

  /** Resolve (and remember) the countryCodeId for the selected country. */
  private resolveCountryCodeId(): string {
    const match =
      this.countryCodes.find((c) => c.countryId && c.countryId === this.form.countryId) ??
      this.countryCodes[0];
    if (match) this.form.countryCodeId = match.id;
    return this.form.countryCodeId;
  }

  async loadMaster() {
    try {
      const [bg, cc, co] = await Promise.all([
        firstValueFrom(this.http.get<any>('/api/master/blood-groups')),
        firstValueFrom(this.http.get<any>('/api/master/country-codes')),
        firstValueFrom(this.http.get<any>('/api/master/countries')),
      ]);
      this.bloodGroups = (bg.data ?? bg).map((b: any) => ({
        ...b,
        label: b.label ? `${b.code} — ${b.label}` : b.code,
      }));
      this.countryCodes = cc.data ?? cc;
      this.countries = co.data ?? co;
      // Default to India (or single country) so dial code + states load immediately.
      if (!this.form.countryId) {
        const india = (this.countries ?? []).find(
          (c: any) => c.isoCode2 === 'IN' || String(c.name ?? '').toLowerCase() === 'india',
        );
        if (india) {
          this.form.countryId = india.id;
          this.resolveCountryCodeId();
          await this.onCountryChange();
        } else if (this.countries.length === 1) {
          this.form.countryId = this.countries[0].id;
          this.resolveCountryCodeId();
          await this.onCountryChange();
        } else if (this.countryCodes.length === 1) {
          this.form.countryCodeId = this.countryCodes[0].id;
        }
      } else {
        this.resolveCountryCodeId();
      }
      this.cdr.markForCheck();
    } catch (e) {
      this.error = this.errors.getUserMessage(e);
      // banner only — no duplicate toast
      this.cdr.markForCheck();
    }
  }

  /** Keep mobile strictly numeric and capped at 10 digits. */
  onMobileInput(value: string) {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 10);
    if (digits !== this.form.mobile) this.form.mobile = digits;
  }

  mobileValid(): boolean {
    return /^[0-9]{10}$/.test(String(this.form.mobile ?? ''));
  }

  async onCountryChange() {
    this.resolveCountryCodeId();
    this.states = [];
    this.cities = [];
    this.form.stateId = '';
    this.form.cityId = '';
    this.cdr.markForCheck();
    if (!this.form.countryId) return;
    try {
      const r = await firstValueFrom(
        this.http.get<any>(`/api/master/countries/${this.form.countryId}/states`),
      );
      this.states = r.data ?? r;
      this.cdr.markForCheck();
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to load states');
    }
  }

  async onStateChange() {
    this.cities = [];
    this.form.cityId = '';
    this.cdr.markForCheck();
    if (!this.form.stateId) return;
    try {
      const r = await firstValueFrom(
        this.http.get<any>(`/api/master/states/${this.form.stateId}/cities`),
      );
      this.cities = r.data ?? r;
      this.cdr.markForCheck();
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to load cities');
    }
  }

  /** Gate every validation — the location dialog opens only when the whole form passes. */
  openLocationDialog(ngForm?: any) {
    this.error = '';
    const fail = (msg: string) => {
      this.error = msg;
      this.cdr.markForCheck();
    };
    if (ngForm?.invalid) {
      Object.values(ngForm.controls ?? {}).forEach((c: any) => c?.markAsTouched?.());
      fail('Please complete all required fields correctly before continuing.');
      return;
    }
    // Explicit per-field re-checks so the dialog never opens on a half-valid
    // form even if a component-level validator fails to propagate to NgForm.
    const f = this.form;
    if (!f.firstName?.trim() || f.firstName.trim().length > 100 || !f.lastName?.trim() || f.lastName.trim().length > 100) {
      fail('Please enter your first and last name (max 100 characters each).');
      return;
    }
    if (!this.dob) {
      fail('Please select your date of birth.');
      return;
    }
    if (!this.isDobValid()) {
      fail('Age must be 18–65 years to donate.');
      return;
    }
    if (!f.bloodGroupId) {
      fail('Please select your blood group.');
      return;
    }
    const email = String(f.email ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      fail('Enter a valid email address.');
      return;
    }
    // Mirrors the backend password policy (min 8 + uppercase + special).
    const pw = String(f.password ?? '');
    if (pw.length < 8 || pw.length > 128) {
      fail('Password must be 8–128 characters.');
      return;
    }
    if (!/[A-Z]/.test(pw)) {
      fail('Password must contain an uppercase letter.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(pw)) {
      fail('Password must contain a special character.');
      return;
    }
    if (!f.countryId || !this.resolveCountryCodeId()) {
      fail('Please select your country.');
      return;
    }
    const mobile = String(f.mobile ?? '').replace(/\D/g, '').slice(0, 10);
    this.form.mobile = mobile;
    if (!this.mobileValid()) {
      fail('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!f.stateId) {
      fail('Please select your state.');
      return;
    }
    if (!f.cityId) {
      fail('Please select your city.');
      return;
    }
    if (!f.area?.trim() || f.area.trim().length > 200) {
      fail('Please enter your area (max 200 characters).');
      return;
    }
    if (!/^[0-9]{6}$/.test(String(f.pinCode ?? '').trim())) {
      fail('Enter a valid 6-digit pin code.');
      return;
    }
    this.locationError = '';
    this.locationDialog = true;
    this.cdr.markForCheck();
    // If map picker was previously opened, re-init after dialog animation
    if (this.showMapPicker) setTimeout(() => this.initPickMap(), 300);
  }

  onLocationDialogHide() {
    // Keep captured state so Confirm stays enabled; but clean up map to avoid leaks
    if (!this.showMapPicker) return;
  }

  toggleMapPicker() {
    this.showMapPicker = !this.showMapPicker;
    this.cdr.markForCheck();
    if (this.showMapPicker) {
      setTimeout(() => this.initPickMap(), 150);
    } else {
      this.destroyPickMap();
    }
  }

  private initPickMap() {
    if (typeof L === 'undefined' || !this.pickMapEl?.nativeElement) return;
    if (this.pickMap) {
      try {
        this.pickMap.invalidateSize();
      } catch {}
      return;
    }
    try {
      const lat = Number(this.form.latitude) || 20.5937;
      const lng = Number(this.form.longitude) || 78.9629;
      const hasValid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      const center: [number, number] = hasValid ? [lat, lng] : [20.5937, 78.9629];
      const zoom = hasValid && this.locationCaptured ? 13 : 5;
      this.pickMap = L.map(this.pickMapEl.nativeElement, {
        attributionControl: true,
        zoomControl: true,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.pickMap);
      this.pickMap.setView(center, zoom);
      if (hasValid) this.updatePickMarker();
      this.pickMap.on('click', (e: any) => {
        const ll = e?.latlng;
        if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) return;
        this.form.latitude = Number(Number(ll.lat).toFixed(6));
        this.form.longitude = Number(Number(ll.lng).toFixed(6));
        this.locationCaptured = true;
        this.locationError = '';
        this.errors.showSuccess('Location picked on map.');
        this.updatePickMarker();
        this.cdr.markForCheck();
      });
      setTimeout(() => {
        try {
          this.pickMap?.invalidateSize();
        } catch {}
      }, 200);
    } catch (e) {
      this.locationError = 'Map could not be loaded. Please use GPS.';
      this.cdr.markForCheck();
    }
  }

  private updatePickMarker() {
    if (!this.pickMap || typeof L === 'undefined') return;
    const lat = Number(this.form.latitude);
    const lng = Number(this.form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      if (this.pickMarker) {
        this.pickMarker.setLatLng([lat, lng]);
      } else {
        this.pickMarker = L.marker([lat, lng], { draggable: true }).addTo(this.pickMap);
        this.pickMarker.on('dragend', () => {
          const ll = this.pickMarker.getLatLng();
          this.form.latitude = Number(Number(ll.lat).toFixed(6));
          this.form.longitude = Number(Number(ll.lng).toFixed(6));
          this.locationCaptured = true;
          this.locationError = '';
          this.cdr.markForCheck();
        });
      }
      // Center map gently on new selection
      try {
        this.pickMap.setView([lat, lng], Math.max(this.pickMap.getZoom(), 13));
      } catch {}
    } catch {}
  }

  private destroyPickMap() {
    try {
      this.pickMap?.remove();
    } catch {}
    this.pickMap = null;
    this.pickMarker = null;
  }

  useMyLocation() {
    this.locationError = '';
    this.locationAccuracy = null;
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser. Pick your location on the map below.';
      this.cdr.markForCheck();
      return;
    }
    // Must be secure context (https or localhost) — otherwise browser blocks geolocation
    if (typeof window !== 'undefined' && (window as any).isSecureContext === false) {
      this.locationError = 'Geolocation needs a secure connection (https or localhost). Please pick on the map instead.';
      this.cdr.markForCheck();
      return;
    }
    this.locating = true;
    this.cdr.markForCheck();

    const handleSuccess = (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy;
      this.locationAccuracy = acc != null ? Math.round(acc) : null;
      this.form.latitude = Number(pos.coords.latitude.toFixed(6));
      this.form.longitude = Number(pos.coords.longitude.toFixed(6));
      this.locationCaptured = true;
      this.locating = false;
      this.locationError = '';
      if (acc != null && acc > 1000) {
        this.errors.showWarn(`Location captured but accuracy is low (±${Math.round(acc)} m). Please drag the pin on the map for precision.`);
        if (!this.showMapPicker) this.toggleMapPicker();
      } else if (acc != null && acc > 200) {
        this.errors.showInfo(`Location captured (±${Math.round(acc)} m). You can fine-tune by dragging the pin on the map.`);
      } else if (acc != null) {
        this.errors.showSuccess(`Location captured (±${Math.round(acc)} m).`);
      } else {
        this.errors.showSuccess('Location captured.');
      }
      if (this.showMapPicker) this.updatePickMarker();
      this.cdr.markForCheck();
    };

    const handleLowFail = (err: GeolocationPositionError) => {
      this.locating = false;
      const code = (err as any)?.code;
      if (code === 1) {
        this.locationError = 'Location permission was denied. Please pick your location on the map below — no GPS needed.';
        if (!this.showMapPicker) setTimeout(() => this.toggleMapPicker(), 200);
      } else if (code === 3) {
        this.locationError = 'Location request timed out. Try again, move near a window/outdoors, or pick on the map.';
      } else if (code === 2) {
        this.locationError = `Location unavailable: ${err.message || 'no position'}. Try again or pick on the map.`;
      } else {
        this.locationError = `Unable to get your location: ${err.message || 'unknown error'}. Please pick on the map below.`;
      }
      this.cdr.markForCheck();
    };

    const handleHighFail = (err: GeolocationPositionError) => {
      const code = (err as any)?.code;
      // On timeout / unavailable, retry with low accuracy (faster, uses WiFi/cell)
      if (code === 3 || code === 2) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleLowFail, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
        });
      } else {
        handleLowFail(err);
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleHighFail, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  }

  /** Fired from the consent dialog — location must be captured first. */
  confirmAndRegister() {
    if (!this.locationCaptured || this.loading) return;
    this.locationDialog = false;
    void this.register();
  }

  async register() {
    this.error = '';
    if (!this.dob) {
      this.error = 'Please select your date of birth.';
      return;
    }
    if (!this.isDobValid()) {
      this.error = 'Age must be 18–65 years to donate.';
      return;
    }
    const mobile = String(this.form.mobile ?? '').replace(/\D/g, '').slice(0, 10);
    this.form.mobile = mobile;
    if (!this.mobileValid()) {
      this.error = 'Enter a valid 10-digit mobile number.';
      return;
    }
    const countryCodeId = this.resolveCountryCodeId();
    if (!countryCodeId) {
      this.error = 'Please select your country.';
      return;
    }
    if (!this.locationCaptured) {
      this.error = 'Please share your location to continue.';
      this.locationDialog = true;
      return;
    }
    this.loading = true;
    try {
      const payload = {
        ...this.form,
        mobile,
        countryCodeId,
        dateOfBirth: this.dob instanceof Date ? this.dob.toISOString().slice(0, 10) : this.dob,
        latitude: Number(this.form.latitude),
        longitude: Number(this.form.longitude),
      };
      await this.auth.register(payload);
      this.success = true;
      this.errors.showSuccess('Account created. Welcome to BloodHelp!');
      const u = this.auth.user();
      setTimeout(() => {
        if (u?.role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
        else this.router.navigate(['/dashboard']);
      }, 600);
    } catch (e: any) {
      this.error = this.errors.getUserMessage(e);
      // banner only — no duplicate toast
    } finally {
      this.loading = false;
    }
  }
}
