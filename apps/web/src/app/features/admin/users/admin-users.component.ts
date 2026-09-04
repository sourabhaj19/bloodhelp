import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" style="margin:16px">
      <h1>Admin — Users</h1>
      <div style="display:flex;gap:8px;margin:12px 0">
        <input [(ngModel)]="search" placeholder="Search email/name/mobile" style="padding:8px;flex:1" />
        <button (click)="load()" style="padding:8px 12px">Search</button>
      </div>
      <p *ngIf="loading">Loading...</p>
      <p *ngIf="error" style="color:#b42318">{{error}}</p>
      <table *ngIf="result" style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid #e5e7eb"><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let u of result.items" style="border-bottom:1px solid #f2f4f7">
            <td>{{u.firstName}} {{u.lastName}}</td>
            <td>{{u.email}}</td>
            <td>{{u.role}}</td>
            <td>{{u.active ? 'Yes' : 'No'}}</td>
            <td style="display:flex;gap:4px">
              <button (click)="toggle(u)" style="padding:4px 8px">{{u.active ? 'Deactivate' : 'Activate'}}</button>
              <button (click)="remove(u)" style="padding:4px 8px;color:#b42318">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  search = '';
  loading = false;
  error = '';
  result: any = null;
  ngOnInit(){ this.load(); }
  load(){
    let params = new HttpParams().set('page','1').set('pageSize','20');
    if(this.search) params = params.set('search', this.search);
    this.loading=true;
    this.http.get<any>('/api/admin/users', { params }).subscribe({
      next: r=>{ this.result = r.data ?? r; this.loading=false; },
      error: e=>{ this.error = e?.error?.error?.message ?? 'Failed'; this.loading=false; }
    });
  }
  toggle(u:any){
    this.http.patch<any>(`/api/admin/users/${u.id}/status`, { active: !u.active }).subscribe({
      next: ()=> this.load(),
      error: e=> alert(e?.error?.error?.message ?? 'Failed')
    });
  }
  remove(u:any){
    if(!confirm('Soft delete user ' + u.email + ' ?')) return;
    this.http.delete<any>(`/api/admin/users/${u.id}`).subscribe({
      next: ()=> this.load(),
      error: e=> alert(e?.error?.error?.message ?? 'Failed')
    });
  }
}
