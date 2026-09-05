import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

interface DashboardData {
  stats: {
    totalDonorsNearby: number;
    myAppreciationsReceived: number;
    myAppreciationsGiven: number;
    unreadNotifications: number;
  };
  myLocation: { area: string; latitude: number; longitude: number };
}

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-4">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">Your blood donation overview at a glance.</p>
      </div>
      <p-button label="Find donors" icon="pi pi-search" routerLink="/donors"></p-button>
    </div>

    <!-- Loading skeletons -->
    <div *ngIf="loading" class="grid">
      <div class="col-12 sm:col-6 lg:col-3" *ngFor="let i of [1, 2, 3, 4]">
        <p-skeleton height="7rem" borderRadius="16px"></p-skeleton>
      </div>
    </div>

    <div *ngIf="needsVerification()" class="verify-banner mb-3">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ verificationHint() }}</span>
      <a routerLink="/profile" class="link">Verify now</a>
    </div>

    <!-- Error state -->
    <p-message *ngIf="!loading && error" severity="error" styleClass="w-full mb-3"></p-message>
    <div *ngIf="!loading && error" class="flex align-items-center gap-2 mb-4">
      <span class="err-text">{{ error }}</span>
      <p-button label="Retry" icon="pi pi-refresh" severity="secondary" [outlined]="true" size="small" (onClick)="load()"></p-button>
    </div>

    <div *ngIf="data && !loading" class="grid">
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat">
          <div class="flex align-items-center justify-content-between">
            <span class="stat-label">Donors nearby</span>
            <span class="stat-icon red"><i class="pi pi-users"></i></span>
          </div>
          <div class="stat-value">{{ data.stats.totalDonorsNearby }}</div>
          <div class="stat-hint">In your city</div>
        </p-card>
      </div>
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat">
          <div class="flex align-items-center justify-content-between">
            <span class="stat-label">Thanks received</span>
            <span class="stat-icon green"><i class="pi pi-heart"></i></span>
          </div>
          <div class="stat-value">{{ data.stats.myAppreciationsReceived }}</div>
          <div class="stat-hint">From recipients</div>
        </p-card>
      </div>
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat">
          <div class="flex align-items-center justify-content-between">
            <span class="stat-label">Thanks given</span>
            <span class="stat-icon blue"><i class="pi pi-gift"></i></span>
          </div>
          <div class="stat-value">{{ data.stats.myAppreciationsGiven }}</div>
          <div class="stat-hint">To donors</div>
        </p-card>
      </div>
      <div class="col-12 sm:col-6 lg:col-3">
        <p-card styleClass="stat clickable" (click)="go('/notifications')">
          <div class="flex align-items-center justify-content-between">
            <span class="stat-label">Notifications</span>
            <span class="stat-icon amber"><i class="pi pi-bell"></i></span>
          </div>
          <div class="stat-value">{{ data.stats.unreadNotifications }}</div>
          <div class="stat-hint">Unread — tap to view</div>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card header="Your location" subheader="Used to find nearby donors">
          <div class="flex align-items-center gap-3">
            <span class="stat-icon red big"><i class="pi pi-map-marker"></i></span>
            <div>
              <div class="font-bold">{{ data.myLocation.area }}</div>
              <div class="muted text-sm">{{ data.myLocation.latitude }}, {{ data.myLocation.longitude }}</div>
            </div>
          </div>
          <p-divider></p-divider>
          <p-button label="Update location" icon="pi pi-map" severity="secondary" [outlined]="true" routerLink="/profile"></p-button>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card header="Quick actions" subheader="Common tasks">
          <div class="flex flex-column gap-2">
            <p-button label="Search donors" icon="pi pi-search" routerLink="/donors" styleClass="w-full"></p-button>
            <p-button label="My profile" icon="pi pi-user" routerLink="/profile" severity="secondary" [outlined]="true" styleClass="w-full"></p-button>
            <p-button label="Appreciations" icon="pi pi-heart" routerLink="/appreciations" severity="secondary" [outlined]="true" styleClass="w-full"></p-button>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { margin: 0.2rem 0 0; color: #667085; }
      :host ::ng-deep .stat { transition: transform 0.15s ease, box-shadow 0.15s ease; }
      :host ::ng-deep .stat:hover { transform: translateY(-2px); }
      :host ::ng-deep .stat.clickable { cursor: pointer; }
      .stat-label { color: #667085; font-size: 0.85rem; font-weight: 600; }
      .stat-value { font-size: 2rem; font-weight: 800; margin-top: 0.3rem; }
      .stat-hint { color: #98a2b3; font-size: 0.82rem; }
      .stat-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 38px; height: 38px; border-radius: 12px; font-size: 1.1rem;
      }
      .stat-icon.red { background: rgba(180, 35, 24, 0.1); color: #b42318; }
      .stat-icon.green { background: rgba(16, 185, 129, 0.12); color: #067647; }
      .stat-icon.blue { background: rgba(59, 130, 246, 0.12); color: #175cd3; }
      .stat-icon.amber { background: rgba(245, 158, 11, 0.15); color: #b54708; }
      .stat-icon.big { width: 48px; height: 48px; font-size: 1.4rem; }
      .muted { color: #667085; }
      .err-text { color: #b42318; font-weight: 600; }
      .verify-banner {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        background: #fffaeb; border: 1px solid #fedf89; color: #93370d;
        border-radius: 12px; padding: 12px 16px; font-weight: 600;
      }
      .verify-banner .pi { color: #dc6803; }
      .verify-banner .link { color: #b42318; font-weight: 800; margin-left: auto; }
      .verify-banner .link:hover { text-decoration: underline; }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private errors = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  data: DashboardData | null = null;
  loading = true;
  error = '';
  emailVerified = true;
  mobileVerified = true;

  ngOnInit() {
    this.load();
    this.http.get<any>('/api/users/me').subscribe({
      next: (r) => {
        const me = r.data ?? r;
        this.emailVerified = me?.emailVerified !== false;
        this.mobileVerified = me?.mobileVerified !== false;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  needsVerification(): boolean {
    return !this.emailVerified || !this.mobileVerified;
  }

  verificationHint(): string {
    if (!this.emailVerified && !this.mobileVerified) return 'Your email and mobile are unverified.';
    if (!this.emailVerified) return 'Your email is unverified.';
    return 'Your mobile number is unverified.';
  }

  go(url: string) {
    this.router.navigateByUrl(url);
  }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/dashboard').subscribe({
      next: (r) => {
        this.data = r.data ?? r;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.error = this.errors.getUserMessage(e);
        this.errors.handleHttpError(e, 'Failed to load dashboard');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
