import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="margin:16px 4vw">
      <h1>Admin Dashboard</h1>
      <p *ngIf="loading">Loading...</p>
      <p *ngIf="error" style="color:#b42318">{{error}}</p>
      <div *ngIf="data" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px"><div>Total users</div><strong style="font-size:1.4rem">{{data.totals.totalUsers}}</strong></div>
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px"><div>Active users</div><strong style="font-size:1.4rem">{{data.totals.activeUsers}}</strong></div>
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px"><div>Open reports</div><strong style="font-size:1.4rem">{{data.totals.totalReportsOpen}}</strong></div>
        <div style="border:1px solid #e5e7eb;padding:16px;border-radius:8px"><div>Total reports</div><strong style="font-size:1.4rem">{{data.totals.totalReports}}</strong></div>
      </div>
      <div *ngIf="data" style="margin-top:16px">
        <h3>Blood group breakdown</h3>
        <ul><li *ngFor="let bg of data.bloodGroupBreakdown">{{bg.bloodGroupCode}}: {{bg.count}}</li></ul>
        <h3>Recent users</h3>
        <ul><li *ngFor="let u of data.recentUsers">{{u.firstName}} {{u.lastName}} — {{u.email}} — {{u.createdAt | date}}</li></ul>
      </div>
    </section>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  data: any = null; loading = true; error='';
  ngOnInit(){
    this.http.get<any>('/api/admin/dashboard').subscribe({
      next: r=>{ this.data = r.data ?? r; this.loading=false; },
      error: e=>{ this.error = e?.error?.error?.message ?? 'Failed'; this.loading=false; }
    });
  }
}
