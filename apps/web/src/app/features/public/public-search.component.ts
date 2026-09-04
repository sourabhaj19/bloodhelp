import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="panel" style="margin:24px 6vw">
      <h1>Search Donors (Public — masked PII, approx distance only)</h1>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
        <select [(ngModel)]="filters.bloodGroupId" style="padding:8px"><option value="">All blood groups</option><option *ngFor="let bg of bloodGroups" [value]="bg.id">{{bg.code}}</option></select>
        <input [(ngModel)]="filters.city" placeholder="City" style="padding:8px" />
        <input [(ngModel)]="filters.area" placeholder="Area" style="padding:8px" />
        <input [(ngModel)]="filters.lat" type="number" placeholder="Lat" style="padding:8px;width:120px" />
        <input [(ngModel)]="filters.lng" type="number" placeholder="Lng" style="padding:8px;width:120px" />
        <select [(ngModel)]="filters.radiusKm" style="padding:8px"><option value="">Any radius</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option></select>
        <button (click)="search()" style="background:#b42318;color:white;padding:8px 16px;border:none;border-radius:8px">Search</button>
      </div>
      <p *ngIf="loading">Loading...</p>
      <p *ngIf="error" style="color:#b42318">{{error}}</p>
      <div style="display:grid;gap:8px">
        <div *ngFor="let d of (result?.items ?? [])" style="border:1px solid #e5e7eb;padding:12px;border-radius:8px">
          <strong>{{d.displayName}}</strong> — {{d.bloodGroup}} — {{d.city}} {{d.area}}
          <span *ngIf="d.approxDistanceKm"> — ~{{d.approxDistanceKm}} km</span>
          <p style="font-size:.85rem;color:#667085">Unauthenticated: coordinates & contact hidden. <a href="/login">Login to see full contact & map</a></p>
        </div>
      </div>
      <div *ngIf="result" style="margin-top:12px">
        <span>Page {{result.page}} / {{result.totalPages}} ({{result.total}} total)</span>
        <button (click)="prev()" [disabled]="filters.page<=1" style="margin-left:8px">Prev</button>
        <button (click)="next()" [disabled]="result.page>=result.totalPages" style="margin-left:4px">Next</button>
      </div>
    </main>
  `,
})
export class PublicSearchComponent implements OnInit {
  private http = inject(HttpClient);
  bloodGroups: any[] = [];
  loading=false; error=''; result:any=null;
  filters:any = { bloodGroupId:'', city:'', area:'', lat:'', lng:'', radiusKm:'', page:1, pageSize:20 };

  ngOnInit(){
    this.http.get<any>('/api/master/blood-groups').subscribe(r=> this.bloodGroups = r.data ?? r);
    this.search();
  }
  buildParams(){
    let p=new HttpParams();
    if(this.filters.bloodGroupId) p=p.set('bloodGroupId', this.filters.bloodGroupId);
    if(this.filters.city) p=p.set('city', this.filters.city);
    if(this.filters.area) p=p.set('area', this.filters.area);
    if(this.filters.lat) p=p.set('lat', String(this.filters.lat));
    if(this.filters.lng) p=p.set('lng', String(this.filters.lng));
    if(this.filters.radiusKm) p=p.set('radiusKm', this.filters.radiusKm);
    p=p.set('page', String(this.filters.page)); p=p.set('pageSize', String(this.filters.pageSize));
    return p;
  }
  search(){
    this.loading=true; this.error='';
    this.http.get<any>('/api/donors', { params: this.buildParams() }).subscribe({
      next: r=>{ this.result = r.data ?? r; this.loading=false; },
      error: e=>{ this.error = e?.error?.error?.message ?? 'Search failed'; this.loading=false; }
    });
  }
  prev(){ if(this.filters.page>1){ this.filters.page--; this.search(); } }
  next(){ if(this.result && this.filters.page<this.result.totalPages){ this.filters.page++; this.search(); } }
}
