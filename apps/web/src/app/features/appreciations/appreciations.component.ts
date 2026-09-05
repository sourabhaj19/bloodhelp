import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">Appreciations</h1>
    <p class="page-sub">Thanks you've received and given.</p>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-tabView>
      <p-tabPanel [header]="'Received (' + received.length + ')'">
        <p-skeleton *ngIf="loadingR" height="4rem" styleClass="mb-2" class="block"></p-skeleton>
        <div class="flex flex-column gap-2" *ngIf="!loadingR">
          <p-card *ngFor="let a of received">
            <div class="flex align-items-center gap-3">
              <p-avatar [label]="(a.sender?.firstName || '?').charAt(0)" shape="circle" styleClass="avatar-red"></p-avatar>
              <div>
                <strong>{{ a.sender?.firstName }} {{ a.sender?.lastName }}</strong>
                <div class="muted text-sm">{{ a.createdAt | date: 'medium' }}</div>
                <p class="mt-1 mb-0">{{ a.message }}</p>
              </div>
            </div>
          </p-card>
          <p-card *ngIf="!received.length"><p class="text-center muted">No thanks received yet.</p></p-card>
        </div>
      </p-tabPanel>
      <p-tabPanel [header]="'Given (' + given.length + ')'">
        <p-skeleton *ngIf="loadingG" height="4rem" styleClass="mb-2" class="block"></p-skeleton>
        <div class="flex flex-column gap-2" *ngIf="!loadingG">
          <p-card *ngFor="let a of given">
            <div class="flex align-items-center gap-3">
              <p-avatar [label]="(a.receiver?.firstName || '?').charAt(0)" shape="circle"></p-avatar>
              <div>
                <strong>{{ a.receiver?.firstName }} {{ a.receiver?.lastName }}</strong>
                <div class="muted text-sm">{{ a.createdAt | date: 'medium' }}</div>
                <p class="mt-1 mb-0">{{ a.message }}</p>
              </div>
            </div>
          </p-card>
          <p-card *ngIf="!given.length"><p class="text-center muted">You haven't thanked anyone yet. Find a donor to thank them.</p></p-card>
        </div>
      </p-tabPanel>
    </p-tabView>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 1rem; color: #667085; }
      .muted { color: #667085; }
      :host ::ng-deep .avatar-red { background: rgba(180, 35, 24, 0.12); color: #b42318; font-weight: 700; }
    `,
  ],
})
export class AppreciationsComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  received: any[] = [];
  given: any[] = [];
  loadingR = true;
  loadingG = true;
  error = '';

  ngOnInit() {
    this.http.get<any>('/api/appreciations/received').subscribe({
      next: (r) => {
        const d = r.data ?? r;
        this.received = d.items ?? (Array.isArray(d) ? d : []);
        this.loadingR = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.loadingR = false;
        this.cdr.markForCheck();
      },
    });
    this.http.get<any>('/api/appreciations/given').subscribe({
      next: (r) => {
        const d = r.data ?? r;
        this.given = d.items ?? (Array.isArray(d) ? d : []);
        this.loadingG = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.loadingG = false;
        this.cdr.markForCheck();
      },
    });
  }
}
