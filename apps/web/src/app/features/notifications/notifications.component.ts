import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="margin:16px">
      <h1>Notifications</h1>
      <button (click)="markAll()" style="padding:8px 12px;margin:8px 0">Mark all read</button>
      <p *ngIf="loading">Loading...</p>
      <div *ngFor="let n of items" style="border:1px solid #e5e7eb;padding:12px;margin:6px 0;border-radius:8px;background:{{n.isRead ? '#f9fafb' : 'white'}}">
        <strong>{{n.title}}</strong> <span style="font-size:.8rem;color:#667085">{{n.createdAt | date:'short'}}</span>
        <p>{{n.message}}</p>
        <button *ngIf="!n.isRead" (click)="mark(n)" style="padding:4px 8px">Mark read</button>
      </div>
    </section>
  `,
})
export class NotificationsComponent implements OnInit {
  private http = inject(HttpClient);
  items: any[] = [];
  loading=true;
  ngOnInit(){ this.load(); }
  load(){
    this.http.get<any>('/api/notifications').subscribe({
      next: r=>{ this.items = (r.data ?? r).items ?? r.data ?? []; this.loading=false; },
      error: ()=> this.loading=false
    });
  }
  mark(n:any){
    this.http.patch<any>(`/api/notifications/${n.id}/read`, {}).subscribe(()=> { n.isRead=true; });
  }
  markAll(){
    this.http.patch<any>(`/api/notifications/read-all`, {}).subscribe(()=> this.load());
  }
}
