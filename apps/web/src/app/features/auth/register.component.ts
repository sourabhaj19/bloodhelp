import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-shell" style="display:flex;justify-content:center;padding:24px">
      <section class="auth-card" style="max-width:640px;width:100%;border:1px solid #e5e7eb;padding:24px;border-radius:12px">
        <a routerLink="/">← Back</a>
        <h1>Register</h1>
        <p>All fields required. Location is captured via coordinates + address hierarchy.</p>
        <form (ngSubmit)="register()" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
          <label>First Name <input [(ngModel)]="form.firstName" name="firstName" required style="width:100%;padding:8px" /></label>
          <label>Last Name <input [(ngModel)]="form.lastName" name="lastName" required style="width:100%;padding:8px" /></label>
          <label>Date of Birth <input [(ngModel)]="form.dateOfBirth" name="dateOfBirth" type="date" required style="width:100%;padding:8px" /></label>
          <label>Email <input [(ngModel)]="form.email" name="email" type="email" required style="width:100%;padding:8px" /></label>
          <label>Blood Group
            <select [(ngModel)]="form.bloodGroupId" name="bloodGroupId" required style="width:100%;padding:8px">
              <option value="">Select</option>
              <option *ngFor="let bg of bloodGroups" [value]="bg.id">{{bg.code}} — {{bg.label}}</option>
            </select>
          </label>
          <label>Country Code
            <select [(ngModel)]="form.countryCodeId" name="countryCodeId" required style="width:100%;padding:8px">
              <option value="">Select</option>
              <option *ngFor="let cc of countryCodes" [value]="cc.id">{{cc.label}}</option>
            </select>
          </label>
          <label>Mobile <input [(ngModel)]="form.mobile" name="mobile" required placeholder="9876543210 or +919876543210" pattern="^(\\d{10}|\\+[1-9]\\d{7,14})$" style="width:100%;padding:8px" /></label>
          <label>Password <input [(ngModel)]="form.password" name="password" type="password" required style="width:100%;padding:8px" /></label>
          <label>Country
            <select [(ngModel)]="form.countryId" name="countryId" required (ngModelChange)="onCountryChange()" style="width:100%;padding:8px">
              <option value="">Select</option>
              <option *ngFor="let c of countries" [value]="c.id">{{c.name}}</option>
            </select>
          </label>
          <label>State
            <select [(ngModel)]="form.stateId" name="stateId" required (ngModelChange)="onStateChange()" style="width:100%;padding:8px">
              <option value="">Select</option>
              <option *ngFor="let s of states" [value]="s.id">{{s.name}}</option>
            </select>
          </label>
          <label>City
            <select [(ngModel)]="form.cityId" name="cityId" required style="width:100%;padding:8px">
              <option value="">Select</option>
              <option *ngFor="let ci of cities" [value]="ci.id">{{ci.name}}</option>
            </select>
          </label>
          <label>Area <input [(ngModel)]="form.area" name="area" required style="width:100%;padding:8px" /></label>
          <label>Pin Code <input [(ngModel)]="form.pinCode" name="pinCode" required style="width:100%;padding:8px" /></label>
          <label>Latitude <input [(ngModel)]="form.latitude" name="latitude" type="number" step="0.000001" required style="width:100%;padding:8px" /></label>
          <label>Longitude <input [(ngModel)]="form.longitude" name="longitude" type="number" step="0.000001" required style="width:100%;padding:8px" /></label>
          <div style="grid-column:1/-1;display:flex;gap:8px">
            <button type="button" (click)="useMyLocation()" style="padding:8px 12px">Use my location (GPS)</button>
            <button type="button" (click)="pickOnMap()" style="padding:8px 12px">Pick on map (approx: geocode area+city)</button>
          </div>
          <div style="grid-column:1/-1">
            <button type="submit" [disabled]="loading" style="background:#b42318;color:white;padding:10px 18px;border:none;border-radius:8px;width:100%">{{loading ? 'Creating...' : 'Create account'}}</button>
            <p *ngIf="error" style="color:#b42318;margin-top:8px">{{error}}</p>
            <p *ngIf="success" style="color:#067647;margin-top:8px">Registered! Redirecting...</p>
          </div>
        </form>
        <p style="margin-top:12px"><a routerLink="/login">Already have an account? Login</a></p>
      </section>
    </main>
  `,
})
export class RegisterComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);

  bloodGroups: any[] = [];
  countryCodes: any[] = [];
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  loading = false;
  error = '';
  success = false;

  form: any = {
    firstName: '',
    lastName: '',
    dateOfBirth: '1995-06-15',
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
    latitude: 19.0760,
    longitude: 72.8777,
  };

  ngOnInit() {
    this.loadMaster();
  }

  loadMaster() {
    this.http.get<any>('/api/master/blood-groups').subscribe((r) => (this.bloodGroups = r.data ?? r));
    this.http.get<any>('/api/master/country-codes').subscribe((r) => (this.countryCodes = r.data ?? r));
    this.http.get<any>('/api/master/countries').subscribe((r) => {
      this.countries = r.data ?? r;
    });
  }

  onCountryChange() {
    this.states = [];
    this.cities = [];
    this.form.stateId = '';
    this.form.cityId = '';
    if (!this.form.countryId) return;
    this.http.get<any>(`/api/master/countries/${this.form.countryId}/states`).subscribe((r) => (this.states = r.data ?? r));
  }
  onStateChange() {
    this.cities = [];
    this.form.cityId = '';
    if (!this.form.stateId) return;
    this.http.get<any>(`/api/master/states/${this.form.stateId}/cities`).subscribe((r) => (this.cities = r.data ?? r));
  }

  useMyLocation() {
    if (!navigator.geolocation) {
      this.error = 'Geolocation not supported';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.latitude = Number(pos.coords.latitude.toFixed(6));
        this.form.longitude = Number(pos.coords.longitude.toFixed(6));
      },
      () => (this.error = 'Unable to get location'),
    );
  }

  pickOnMap() {
    // Simple forward geocode via API (MapLocationPickerComponent option 3)
    const q = `${this.form.area}, ${this.cities.find((c) => c.id === this.form.cityId)?.name ?? ''}, ${this.states.find((s) => s.id === this.form.stateId)?.name ?? ''}`;
    if (!q.trim()) {
      this.error = 'Enter area/city/state first';
      return;
    }
    this.http.get<any>('/api/geocoding/forward', { params: { address: q } }).subscribe({
      next: (r) => {
        const items = r.data ?? r;
        if (items && items.length) {
          this.form.latitude = items[0].latitude;
          this.form.longitude = items[0].longitude;
        } else this.error = 'Geocoding provider not configured or no result';
      },
      error: () => (this.error = 'Geocoding failed'),
    });
  }

  async register() {
    this.error = '';
    this.loading = true;
    try {
      // Convert string numbers
      const payload = { ...this.form, latitude: Number(this.form.latitude), longitude: Number(this.form.longitude) };
      await this.auth.register(payload);
      this.success = true;
      const u = this.auth.user();
      setTimeout(() => {
        if (u?.role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
        else this.router.navigate(['/dashboard']);
      }, 600);
    } catch (e: any) {
      this.error = e?.error?.error?.message ?? e?.error?.message ?? JSON.stringify(e?.error?.details ?? 'Registration failed');
    } finally {
      this.loading = false;
    }
  }
}
