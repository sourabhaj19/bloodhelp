import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Country codes</h1>
    <p class="page-sub">Dial codes used for mobile numbers at registration.</p>
    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
    <p-card *ngIf="loading" header="Loading…"><p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1,2,3]"></p-skeleton></p-card>
    <p-card *ngIf="!loading" header="All codes" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm">
        <ng-template pTemplate="header"><tr><th>Code</th><th>Label</th></tr></ng-template>
        <ng-template pTemplate="body" let-c><tr><td><strong>{{ c.code }}</strong></td><td>{{ c.label || '—' }}</td></tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="2" class="text-center muted">No country codes found.</td></tr></ng-template>
      </p-table>
    </p-card>
  `,
  styles: [` .muted { color: #98a2b3; } `],
})
export class MasterCountryCodesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);
  rows: any[] = [];
  loading = true;
  error = '';
  ngOnInit() {
    this.http.get<any>('/api/master/country-codes').subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.errors.handleHttpError(e, 'Failed to load country codes'); this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
