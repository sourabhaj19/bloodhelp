import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { SharedUiModule } from '../../shared/shared-ui.module';

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

        <p-steps [model]="steps" [activeIndex]="activeStep" styleClass="mb-4" [readonly]="false"></p-steps>

        <form (ngSubmit)="register()" #regForm="ngForm">
          <!-- STEP 1: Account -->
          <div *ngIf="activeStep === 0" class="formgrid grid">
            <div class="field col-12 md:col-6">
              <label for="firstName">First name</label>
              <input pInputText id="firstName" [(ngModel)]="form.firstName" name="firstName" required class="w-full" />
            </div>
            <div class="field col-12 md:col-6">
              <label for="lastName">Last name</label>
              <input pInputText id="lastName" [(ngModel)]="form.lastName" name="lastName" required class="w-full" />
            </div>
            <div class="field col-12 md:col-6">
              <label for="dob">Date of birth</label>
              <p-calendar
                inputId="dob"
                [(ngModel)]="dob"
                name="dateOfBirth"
                dateFormat="yy-mm-dd"
                [showIcon]="true"
                [maxDate]="maxDob"
                placeholder="1995-06-15"
                styleClass="w-full"
                inputStyleClass="w-full"
                required
              ></p-calendar>
            </div>
            <div class="field col-12 md:col-6">
              <label for="email">Email</label>
              <input pInputText id="email" [(ngModel)]="form.email" name="email" type="email" required email class="w-full" placeholder="user@example.com" />
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
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-6">
              <label for="password">Password</label>
              <p-password
                [(ngModel)]="form.password"
                name="password"
                inputId="password"
                required
                minlength="8"
                placeholder="Min. 8 characters"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
              ></p-password>
            </div>
            <div class="field col-12 md:col-6">
              <label for="cc">Country code</label>
              <p-dropdown
                inputId="cc"
                [(ngModel)]="form.countryCodeId"
                name="countryCodeId"
                [options]="countryCodes"
                optionLabel="label"
                optionValue="id"
                placeholder="Select dial code"
                [filter]="true"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-6">
              <label for="mobile">Mobile</label>
              <input pInputText id="mobile" [(ngModel)]="form.mobile" name="mobile" required class="w-full" placeholder="9876543210" />
              <small class="hint">10 digits or +&lt;country&gt;&lt;number&gt;</small>
            </div>
          </div>

          <!-- STEP 2: Location -->
          <div *ngIf="activeStep === 1" class="formgrid grid">
            <div class="field col-12 md:col-4">
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
                (onChange)="onCountryChange()"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-4">
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
                [disabled]="!form.countryId"
                (onChange)="onStateChange()"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-4">
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
                [disabled]="!form.stateId"
                styleClass="w-full"
                required
              ></p-dropdown>
            </div>
            <div class="field col-12 md:col-6">
              <label for="area">Area</label>
              <input pInputText id="area" [(ngModel)]="form.area" name="area" required class="w-full" placeholder="Street / locality" />
            </div>
            <div class="field col-12 md:col-6">
              <label for="pin">Pin code</label>
              <input pInputText id="pin" [(ngModel)]="form.pinCode" name="pinCode" required class="w-full" placeholder="400001" />
            </div>
            <div class="field col-6">
              <label for="lat">Latitude</label>
              <p-inputNumber inputId="lat" [(ngModel)]="form.latitude" name="latitude" [minFractionDigits]="4" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full" required></p-inputNumber>
            </div>
            <div class="field col-6">
              <label for="lng">Longitude</label>
              <p-inputNumber inputId="lng" [(ngModel)]="form.longitude" name="longitude" [minFractionDigits]="4" [maxFractionDigits]="6" styleClass="w-full" inputStyleClass="w-full" required></p-inputNumber>
            </div>
            <div class="col-12 flex flex-wrap gap-2">
              <p-button type="button" label="Use my GPS location" icon="pi pi-map-marker" severity="secondary" [outlined]="true" (onClick)="useMyLocation()"></p-button>
              <p-button type="button" label="Geocode area + city" icon="pi pi-globe" severity="secondary" [outlined]="true" (onClick)="pickOnMap()"></p-button>
            </div>
          </div>

          <div class="flex justify-content-between mt-3">
            <p-button *ngIf="activeStep === 1" type="button" label="Back" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="activeStep = 0"></p-button>
            <span *ngIf="activeStep === 0"></span>
            <p-button *ngIf="activeStep === 0" type="button" label="Continue" icon="pi pi-arrow-right" iconPos="right" (onClick)="activeStep = 1" [disabled]="!stepOneValid()"></p-button>
            <p-button *ngIf="activeStep === 1" type="submit" label="Create account" icon="pi pi-check" [loading]="loading" [disabled]="regForm.invalid || loading"></p-button>
          </div>
        </form>

        <p class="text-center mt-3 mb-0">
          Already have an account? <a routerLink="/login" class="link font-bold">Log in</a>
        </p>
      </p-card>
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
    `,
  ],
})
export class RegisterComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private errors = inject(ErrorHandlerService);

  steps = [{ label: 'Account' }, { label: 'Location' }];
  activeStep = 0;

  bloodGroups: any[] = [];
  countryCodes: any[] = [];
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  loading = false;
  error = '';
  success = false;
  dob: Date | null = new Date('1995-06-15');
  maxDob = new Date();

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
    this.loadMaster();
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
    } catch (e) {
      this.error = this.errors.getUserMessage(e);
      this.errors.handleHttpError(e as any, 'Failed to load form data');
    }
  }

  stepOneValid(): boolean {
    return !!(
      this.form.firstName?.trim() &&
      this.form.lastName?.trim() &&
      this.form.email?.trim() &&
      this.form.password?.length >= 8 &&
      this.form.bloodGroupId &&
      this.form.countryCodeId &&
      this.form.mobile?.trim() &&
      this.dob
    );
  }

  async onCountryChange() {
    this.states = [];
    this.cities = [];
    this.form.stateId = '';
    this.form.cityId = '';
    if (!this.form.countryId) return;
    try {
      const r = await firstValueFrom(
        this.http.get<any>(`/api/master/countries/${this.form.countryId}/states`),
      );
      this.states = r.data ?? r;
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to load states');
    }
  }

  async onStateChange() {
    this.cities = [];
    this.form.cityId = '';
    if (!this.form.stateId) return;
    try {
      const r = await firstValueFrom(
        this.http.get<any>(`/api/master/states/${this.form.stateId}/cities`),
      );
      this.cities = r.data ?? r;
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Failed to load cities');
    }
  }

  useMyLocation() {
    if (!navigator.geolocation) {
      this.errors.showWarn('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.latitude = Number(pos.coords.latitude.toFixed(6));
        this.form.longitude = Number(pos.coords.longitude.toFixed(6));
        this.errors.showSuccess('GPS location captured.');
      },
      () => this.errors.showWarn('Unable to get your location. Please allow location access.'),
    );
  }

  async pickOnMap() {
    const city = this.cities.find((c) => c.id === this.form.cityId)?.name ?? '';
    const state = this.states.find((s) => s.id === this.form.stateId)?.name ?? '';
    const q = `${this.form.area}, ${city}, ${state}`.trim().replace(/^,|,$/g, '');
    if (!this.form.area?.trim()) {
      this.errors.showWarn('Enter area / city / state first.');
      return;
    }
    try {
      const r: any = await firstValueFrom(
        this.http.get<any>('/api/geocoding/forward', { params: { address: q } }),
      );
      const items = r.data ?? r;
      if (items?.length) {
        this.form.latitude = items[0].latitude;
        this.form.longitude = items[0].longitude;
        this.errors.showSuccess('Location approximated from address.');
      } else {
        this.errors.showWarn('No geocoding result. You can still adjust coordinates manually.');
      }
    } catch (e) {
      this.errors.handleHttpError(e as any, 'Geocoding failed');
    }
  }

  async register() {
    this.error = '';
    if (!this.dob) {
      this.error = 'Please select your date of birth.';
      return;
    }
    this.loading = true;
    try {
      const payload = {
        ...this.form,
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
      this.errors.handleHttpError(e, 'Registration failed');
    } finally {
      this.loading = false;
    }
  }
}
