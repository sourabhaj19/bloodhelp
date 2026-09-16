import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">Audit logs</h1>
        <p class="page-sub">Immutable trail of admin and system actions. Filter by entity, action or actor.</p>
      </div>
      <p-button label="Refresh" icon="pi pi-refresh" severity="secondary" [outlined]="true" (onClick)="load()"></p-button>
    </div>

    <p-card styleClass="mb-3">
      <div class="formgrid grid">
        <div class="field col-12 md:col-3">
          <label for="entityType">Entity type</label>
          <input pInputText id="entityType" [(ngModel)]="filters.entityType" placeholder="e.g. User" class="w-full" />
        </div>
        <div class="field col-12 md:col-3">
          <label for="entityId">Entity ID</label>
          <input pInputText id="entityId" [(ngModel)]="filters.entityId" placeholder="UUID" class="w-full" />
        </div>
        <div class="field col-12 md:col-3">
          <label for="action">Action</label>
          <p-dropdown inputId="action" [(ngModel)]="filters.action" [options]="actionOptions" placeholder="All actions" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
        </div>
        <div class="field col-12 md:col-3">
          <label for="actor">Actor user ID</label>
          <input pInputText id="actor" [(ngModel)]="filters.actorUserId" placeholder="UUID" class="w-full" />
        </div>
        <div class="col-12 flex gap-2">
          <p-button label="Search" icon="pi pi-search" (onClick)="onSearch()" [loading]="loading"></p-button>
          <p-button label="Clear" severity="secondary" [outlined]="true" (onClick)="clear()"></p-button>
        </div>
      </div>
    </p-card>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading audit logs…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1,2,3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading && result" header="Trail" [subheader]="result.total + ' entries'">
      <p-table [value]="result.items ?? []" styleClass="p-datatable-sm" responsiveLayout="scroll" [tableStyle]="{'min-width':'820px'}">
        <ng-template pTemplate="header">
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>IP</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="text-sm">{{ row.createdAt | date:'medium' }}</td>
            <td>
              <div *ngIf="row.actor" class="text-sm"><strong>{{ row.actor.firstName }} {{ row.actor.lastName }}</strong><div class="muted">{{ row.actor.email }}</div></div>
              <span *ngIf="!row.actor" class="muted text-sm">system</span>
            </td>
            <td><p-tag [value]="row.action" severity="info"></p-tag></td>
            <td class="text-sm"><div>{{ row.entityType }}</div><div class="muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [pTooltip]="row.entityId">{{ row.entityId }}</div></td>
            <td class="text-sm muted">{{ row.ipAddress || '—' }}</td>
            <td><p-button label="Details" size="small" severity="secondary" [outlined]="true" (onClick)="open(row)"></p-button></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center muted">No audit entries for these filters.</td></tr>
        </ng-template>
      </p-table>
      <p-paginator
        [rows]="pageSize"
        [totalRecords]="result.total ?? 0"
        [rowsPerPageOptions]="[10,20,50]"
        [first]="(page-1)*pageSize"
        (onPageChange)="onPage($event)"
        styleClass="mt-3">
      </p-paginator>
    </p-card>

    <p-dialog [(visible)]="dialog" header="Audit entry" [modal]="true" [dismissableMask]="true" [draggable]="false"
      [keepInViewport]="true" [blockScroll]="true" [resizable]="false" appendTo="body" [baseZIndex]="1100" [autoZIndex]="true"
      [style]="{width:'min(720px,96vw)'}" [contentStyle]="{'max-height':'65vh','overflow':'auto'}" styleClass="audit-dialog">
      <div *ngIf="selected" class="flex flex-column gap-3">
        <div class="grid">
          <div class="col-6"><div class="muted text-sm">When</div>{{ selected.createdAt | date:'medium' }}</div>
          <div class="col-6"><div class="muted text-sm">Actor</div><span *ngIf="selected.actor">{{ selected.actor.firstName }} {{ selected.actor.lastName }} ({{ selected.actor.email }})</span><span *ngIf="!selected.actor">system</span></div>
          <div class="col-6"><div class="muted text-sm">Action</div><p-tag [value]="selected.action"></p-tag></div>
          <div class="col-6"><div class="muted text-sm">Entity</div><span style="word-break:break-all">{{ selected.entityType }} / {{ selected.entityId }}</span></div>
          <div class="col-6"><div class="muted text-sm">IP</div>{{ selected.ipAddress || '—' }}</div>
          <div class="col-6"><div class="muted text-sm">User agent</div><span class="text-sm" style="word-break:break-all">{{ selected.userAgent || '—' }}</span></div>
        </div>
        <p-divider></p-divider>
        <div>
          <div class="muted text-sm mb-1">Old value</div>
          <pre class="audit-json">{{ selected.oldValue ? (selected.oldValue | json) : '—' }}</pre>
        </div>
        <div>
          <div class="muted text-sm mb-1">New value</div>
          <pre class="audit-json">{{ selected.newValue ? (selected.newValue | json) : '—' }}</pre>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Close" severity="secondary" [text]="true" (onClick)="dialog=false"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .page-title{margin:0;font-size:1.9rem;letter-spacing:-0.02em}
    .page-sub{margin:.2rem 0 1rem;color:#667085}
    .muted{color:#667085}
    .field label{display:block;margin-bottom:.45rem;font-weight:700;font-size:.87rem;color:#344054}
    .audit-json{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:.6rem;max-height:220px;overflow:auto;font-size:.82rem;white-space:pre-wrap;word-break:break-word}
  `],
})
export class AuditLogsComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  actionOptions = ['CREATE','UPDATE','DELETE','ACTIVATE','DEACTIVATE','SOFT_DELETE','STATUS_CHANGE','ROLE_CHANGE'];

  filters: any = { entityType:'', entityId:'', action:'', actorUserId:'' };
  page = 1;
  pageSize = 20;
  result: any = null;
  loading = false;
  error = '';
  dialog = false;
  selected: any = null;

  ngOnInit(){ this.load(); }

  onSearch(){ this.page=1; this.load(); }
  clear(){
    this.filters = { entityType:'', entityId:'', action:'', actorUserId:'' };
    this.page=1;
    this.load();
  }
  onPage(e:any){ this.page=e.page+1; this.pageSize=e.rows; this.load(); }

  load(){
    this.loading=true; this.error=''; this.cdr.markForCheck();
    let params = new HttpParams().set('page',String(this.page)).set('pageSize',String(this.pageSize));
    if(this.filters.entityType?.trim()) params=params.set('entityType',this.filters.entityType.trim());
    if(this.filters.entityId?.trim()) params=params.set('entityId',this.filters.entityId.trim());
    if(this.filters.action) params=params.set('action',this.filters.action);
    if(this.filters.actorUserId?.trim()) params=params.set('actorUserId',this.filters.actorUserId.trim());
    this.http.get<any>('/api/admin/audit-logs',{params}).subscribe({
      next:(r)=>{ this.result=r.data??r; this.loading=false; this.cdr.markForCheck(); },
      error:(e)=>{ this.error=this.errors.getUserMessage(e); this.errors.handleHttpError(e,'Failed to load audit logs'); this.loading=false; this.cdr.markForCheck(); }
    });
  }

  open(row:any){ this.selected=row; this.dialog=true; }
}
