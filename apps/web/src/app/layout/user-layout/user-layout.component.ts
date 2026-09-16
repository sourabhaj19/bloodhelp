import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/dashboard">
        <span class="brand-icon"><i class="pi pi-heart-fill"></i></span>
        BloodHelp
      </a>
      <nav class="desktop-nav">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/donors" routerLinkActive="active">Donors</a>
        <a routerLink="/appreciations" routerLinkActive="active">Thanks</a>
        <a routerLink="/notifications" routerLinkActive="active">Notifications</a>
        <a routerLink="/reports" routerLinkActive="active">My reports</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
        <a routerLink="/change-password" routerLinkActive="active">Password</a>
      </nav>
      <div class="topbar-actions">
        <span class="notif-wrap" style="position:relative; display:inline-flex">
          <p-button icon="pi pi-bell" severity="secondary" [outlined]="true" [rounded]="true" routerLink="/notifications" pTooltip="Notifications" tooltipPosition="bottom" styleClass="hide-sm"></p-button>
          <span *ngIf="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </span>
        <p-button icon="pi pi-user" severity="secondary" [outlined]="true" [rounded]="true" routerLink="/profile" pTooltip="Profile" tooltipPosition="bottom" styleClass="hide-sm"></p-button>
        <p-button icon="pi pi-sign-out" severity="secondary" [text]="true" [rounded]="true" (onClick)="logout()" pTooltip="Logout" tooltipPosition="bottom" styleClass="hide-sm"></p-button>
        <p-button icon="pi pi-bars" severity="secondary" [outlined]="true" styleClass="mobile-btn" (onClick)="sidebar = true" ariaLabel="Open menu"></p-button>
      </div>
    </header>

    <p-sidebar [(visible)]="sidebar" position="right" styleClass="w-20rem">
      <h3 class="mt-0 mb-3">Menu</h3>
      <div class="flex flex-column gap-1">
        <a routerLink="/dashboard" routerLinkActive="active" (click)="sidebar = false" class="side-link">Dashboard</a>
        <a routerLink="/donors" routerLinkActive="active" (click)="sidebar = false" class="side-link">Find donors</a>
        <a routerLink="/appreciations" routerLinkActive="active" (click)="sidebar = false" class="side-link">Thanks</a>
        <a routerLink="/notifications" routerLinkActive="active" (click)="sidebar = false" class="side-link">Notifications <span *ngIf="unreadCount>0" class="ml-2 p-tag p-tag-danger" style="font-size:0.7rem">{{ unreadCount }}</span></a>
        <a routerLink="/reports" routerLinkActive="active" (click)="sidebar = false" class="side-link">My reports</a>
        <a routerLink="/profile" routerLinkActive="active" (click)="sidebar = false" class="side-link">Profile</a>
        <a routerLink="/change-password" routerLinkActive="active" (click)="sidebar = false" class="side-link">Change password</a>
        <p-divider></p-divider>
        <p-button label="Logout" icon="pi pi-sign-out" severity="secondary" [outlined]="true" styleClass="w-full" (onClick)="logout()"></p-button>
      </div>
    </p-sidebar>

    <main class="page-wrap">
      <router-outlet />
    </main>
  `,
  styles: [`
    .notif-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 999px;
      background: #d92d20;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      line-height: 20px;
      text-align: center;
      border: 2px solid #fff;
      pointer-events: none;
      z-index: 1;
    }
  `],
})
export class UserLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ErrorHandlerService);
  sidebar = false;
  unreadCount = 0;
  private pollId: any = null;

  ngOnInit() {
    this.loadUnread();
    // Refresh on navigation (e.g., after marking read)
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.loadUnread());
    // Poll every 30s while layout is active
    this.pollId = setInterval(() => this.loadUnread(), 30000);
    // Listen for storage sync if notifications changed in another tab
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorage);
      window.addEventListener('focus', this.onFocus);
      window.addEventListener('bloodhelp:notifs', this.onFocus as any);
    }
  }

  ngOnDestroy() {
    if (this.pollId) clearInterval(this.pollId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.onStorage);
      window.removeEventListener('focus', this.onFocus);
      window.removeEventListener('bloodhelp:notifs', this.onFocus as any);
    }
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === 'bloodhelp:notifs') this.loadUnread();
  };

  private onFocus = () => this.loadUnread();

  private loadUnread() {
    this.http.get<any>('/api/notifications/unread-count').subscribe({
      next: (r) => {
        const c = r?.data?.count ?? r?.count ?? 0;
        this.unreadCount = Number(c) || 0;
        this.cdr.markForCheck();
      },
      error: () => {
        // Fallback: try list with pageSize 1 to get total unread
        this.http.get<any>('/api/notifications', { params: { isRead: 'false', page: '1', pageSize: '1' } as any }).subscribe({
          next: (r) => {
            const d = r?.data ?? r;
            this.unreadCount = Number(d?.total ?? 0) || 0;
            this.cdr.markForCheck();
          },
          error: () => {},
        });
      },
    });
  }

  async logout() {
    this.sidebar = false;
    try {
      await this.auth.logout();
      this.toast.showSuccess('You have been logged out.');
    } catch {
      this.router.navigate(['/login']);
    }
  }
}
