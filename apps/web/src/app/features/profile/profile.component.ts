import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="max-width:720px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h1>Profile</h1>
      <p *ngIf="loading">Loading...</p>
      <form *ngIf="!loading && profile" (ngSubmit)="save()" style="display:grid;gap:12px;margin-top:12px">
        <label>First Name <input [(ngModel)]="profile.firstName" name="firstName" style="width:100%;padding:8px" /></label>
        <label>Last Name <input [(ngModel)]="profile.lastName" name="lastName" style="width:100%;padding:8px" /></label>
        <label>Email <input [(ngModel)]="profile.email" name="email" type="email" style="width:100%;padding:8px" /></label>
        <label>Mobile <input [(ngModel)]="profile.mobile" name="mobile" style="width:100%;padding:8px" /></label>
        <label>Area <input [(ngModel)]="profile.area" name="area" style="width:100%;padding:8px" /></label>
        <label>Pin Code <input [(ngModel)]="profile.pinCode" name="pinCode" style="width:100%;padding:8px" /></label>
        <label>Latitude <input [(ngModel)]="profile.latitude" name="latitude" type="number" step="0.000001" style="width:100%;padding:8px" /></label>
        <label>Longitude <input [(ngModel)]="profile.longitude" name="longitude" type="number" step="0.000001" style="width:100%;padding:8px" /></label>
        <div style="display:flex;gap:8px">
          <button type="button" (click)="useMyLocation()" style="padding:8px 12px">Use my location</button>
          <button type="submit" [disabled]="saving" style="background:#b42318;color:white;padding:8px 16px;border:none;border-radius:8px">{{saving ? 'Saving...' : 'Save'}}</button>
        </div>
        <p *ngIf="message" style="color:#067647">{{message}}</p>
        <p *ngIf="error" style="color:#b42318">{{error}}</p>
      </form>
      <section style="margin-top:16px">
        <h3>Account Status</h3>
        <label style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" [checked]="profile?.active" (change)="toggleActive($event)" /> Active
        </label>
      </section>
    </section>
  `,
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  profile: any = null;
  loading = true;
  saving = false;
  message = '';
  error = '';

  ngOnInit() {
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => { this.profile = r.data ?? r; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Failed to load profile'; },
    });
  }

  useMyLocation() {
    if (!navigator.geolocation) { this.error = 'Geolocation not supported'; return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.profile.latitude = Number(pos.coords.latitude.toFixed(6));
        this.profile.longitude = Number(pos.coords.longitude.toFixed(6));
      },
      () => (this.error = 'Unable to get location'),
    );
  }

  save() {
    this.saving = true; this.message=''; this.error='';
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
      next: (r) => { this.profile = r.data ?? r; this.message = 'Saved'; this.saving=false; },
      error: (e) => { this.error = e?.error?.error?.message ?? 'Save failed'; this.saving=false; },
    });
  }

  toggleActive(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.http.patch<any>('/api/users/me/status', { active: checked }).subscribe({
      next: () => { this.profile.active = checked; this.message = 'Status updated'; },
      error: (err) => { this.error = err?.error?.error?.message ?? 'Status update failed'; },
    });
  }
}
