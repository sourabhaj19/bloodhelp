import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="margin:16px">
      <h1>Appreciations</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
        <div><h3>Received</h3><p *ngIf="loadingR">Loading...</p><div *ngFor="let a of received" style="border:1px solid #e5e7eb;padding:8px;margin:4px 0;border-radius:8px"><strong>{{a.sender.firstName}} {{a.sender.lastName}}</strong><p>{{a.message}}</p><small>{{a.createdAt | date}}</small></div></div>
        <div><h3>Given</h3><p *ngIf="loadingG">Loading...</p><div *ngFor="let a of given" style="border:1px solid #e5e7eb;padding:8px;margin:4px 0;border-radius:8px"><strong>{{a.receiver.firstName}} {{a.receiver.lastName}}</strong><p>{{a.message}}</p><small>{{a.createdAt | date}}</small></div></div>
      </div>
    </section>
  `,
})
export class AppreciationsComponent implements OnInit {
  private http = inject(HttpClient);
  received:any[]=[]; given:any[]=[]; loadingR=true; loadingG=true;
  ngOnInit(){
    this.http.get<any>('/api/appreciations/received').subscribe({ next: r=>{ this.received = (r.data ?? r).items ?? []; this.loadingR=false; }, error: ()=> this.loadingR=false });
    this.http.get<any>('/api/appreciations/given').subscribe({ next: r=>{ this.given = (r.data ?? r).items ?? []; this.loadingG=false; }, error: ()=> this.loadingG=false });
  }
}
