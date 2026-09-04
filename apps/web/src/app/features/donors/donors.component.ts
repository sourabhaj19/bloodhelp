import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="margin:16px 4vw">
      <h1>Donor Search (Authenticated — tiered authenticated DTOs)</h1>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
        <select [(ngModel)]="filters.bloodGroupId" style="padding:8px"><option value="">All blood groups</option><option *ngFor="let bg of bloodGroups" [value]="bg.id">{{bg.code}}</option></select>
        <input [(ngModel)]="filters.city" placeholder="City" style="padding:8px" />
        <input [(ngModel)]="filters.area" placeholder="Area" style="padding:8px" />
        <input [(ngModel)]="filters.pinCode" placeholder="PinCode" style="padding:8px" />
        <input [(ngModel)]="filters.lat" type="number" step="0.000001" placeholder="Lat" style="padding:8px;width:120px" />
        <input [(ngModel)]="filters.lng" type="number" step="0.000001" placeholder="Lng" style="padding:8px;width:120px" />
        <select [(ngModel)]="filters.radiusKm" style="padding:8px"><option value="">Any radius</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option></select>
        <button (click)="search()" style="background:#b42318;color:white;padding:8px 16px;border:none;border-radius:8px">Search</button>
        <button (click)="useMyLocation()" style="padding:8px 12px">Use my location</button>
      </div>
      <p *ngIf="loading">Loading...</p>
      <p *ngIf="error" style="color:#b42318">{{error}}</p>
      <table *ngIf="result" style="width:100%;border-collapse:collapse">
        <thead><tr style="text-align:left;border-bottom:1px solid #e5e7eb"><th>Name</th><th>Blood</th><th>Location</th><th>Distance</th><th>Contact</th><th>Thanks</th></tr></thead>
        <tbody>
          <tr *ngFor="let d of result.items" style="border-bottom:1px solid #f2f4f7">
            <td>{{d.displayName || d.fullName}}</td>
            <td>{{d.bloodGroup}}</td>
            <td>{{d.city}} {{d.area}}</td>
            <td>{{d.approxDistanceKm ?? '—'}} km</td>
            <td>
              <span *ngIf="d.latitude">{{d.pinCode}} — {{d.latitude | number:'1.4-4'}},{{d.longitude | number:'1.4-4'}}</span>
              <span *ngIf="!d.latitude">Login to see contact</span>
            </td>
            <td><button (click)="thank(d)" style="padding:4px 8px">Give Thanks</button></td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="result" style="margin-top:12px;display:flex;gap:8px;align-items:center">
        <button (click)="prev()" [disabled]="filters.page<=1">Prev</button>
        <span>Page {{result.page}} / {{result.totalPages}} ({{result.total}} total)</span>
        <button (click)="next()" [disabled]="result.page>=result.totalPages">Next</button>
      </div>
    </section>
  `,
})
export class DonorsComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  bloodGroups: any[] = [];
  loading = false;
  error = '';
  result: any = null;
  filters: any = { bloodGroupId: '', city: '', area: '', pinCode: '', lat: '', lng: '', radiusKm: '', page: 1, pageSize: 20 };

  ngOnInit() {
    this.http.get<any>('/api/master/blood-groups').subscribe((r) => (this.bloodGroups = r.data ?? r));
    this.search();
    // Prefill lat/lng from own profile if authenticated
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => {
        const me = r.data ?? r;
        if (me.latitude) { this.filters.lat = me.latitude; this.filters.lng = me.longitude; }
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
    if (this.filters.lat) p = p.set('lat', String(this.filters.lat));
    if (this.filters.lng) p = p.set('lng', String(this.filters.lng));
    if (this.filters.radiusKm) p = p.set('radiusKm', this.filters.radiusKm);
    p = p.set('page', String(this.filters.page));
    p = p.set('pageSize', String(this.filters.pageSize));
    return p;
  }

  search() {
    this.loading = true; this.error='';
    this.http.get<any>('/api/donors', { params: this.buildParams() }).subscribe({
      next: (r) => { this.result = r.data ?? r; this.loading=false; },
      error: (e) => { this.error = e?.error?.error?.message ?? 'Search failed'; this.loading=false; },
    });
  }

  prev(){ if(this.filters.page>1){ this.filters.page--; this.search(); } }
  next(){ if(this.result && this.filters.page<this.result.totalPages){ this.filters.page++; this.search(); } }

  useMyLocation() {
    if (!navigator.geolocation) { this.error='No geolocation'; return; }
    navigator.geolocation.getCurrentPosition((pos)=>{
      this.filters.lat = pos.coords.latitude.toFixed(6);
      this.filters.lng = pos.coords.longitude.toFixed(6);
      this.filters.radiusKm = '10';
      this.search();
    });
  }

  thank(donor: any) {
    this.http.post<any>('/api/appreciations', { receiverUserId: donor.id, message: 'Thank you for being a donor!' }).subscribe({
      next: ()=> alert('Thanks sent to ' + donor.displayName),
      error: (e)=> alert(e?.error?.error?.message ?? 'Failed to thank'),
    });
  }
}
