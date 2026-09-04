import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="margin:16px 4vw">
      <h1>Dashboard</h1>
      <p *ngIf="loading">Loading...</p>
      <p *ngIf="error" style="color:#b42318">{{error}}</p>
      <div *ngIf="data" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:12px">
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px">
          <div style="font-size:.85rem;color:#667085">Donors in your city</div>
          <div style="font-size:1.5rem;font-weight:600">{{data.stats.totalDonorsNearby}}</div>
        </div>
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px">
          <div style="font-size:.85rem;color:#667085">Thanks received</div>
          <div style="font-size:1.5rem;font-weight:600">{{data.stats.myAppreciationsReceived}}</div>
        </div>
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px">
          <div style="font-size:.85rem;color:#667085">Thanks given</div>
          <div style="font-size:1.5rem;font-weight:600">{{data.stats.myAppreciationsGiven}}</div>
        </div>
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px">
          <div style="font-size:.85rem;color:#667085">Unread notifications</div>
          <div style="font-size:1.5rem;font-weight:600">{{data.stats.unreadNotifications}}</div>
        </div>
      </div>
      <div *ngIf="data" style="margin-top:16px;color:#667085">Your location: {{data.myLocation.area}} — {{data.myLocation.latitude}}, {{data.myLocation.longitude}}</div>
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  data: any = null;
  loading = true;
  error = '';
  ngOnInit() {
    this.http.get<any>('/api/dashboard').subscribe({
      next: (r) => { this.data = r.data ?? r; this.loading=false; },
      error: (e) => { this.error = e?.error?.error?.message ?? 'Failed to load dashboard'; this.loading=false; },
    });
  }
}
