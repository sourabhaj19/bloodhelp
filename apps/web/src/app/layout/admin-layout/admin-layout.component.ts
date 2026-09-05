import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar admin-bar">
      <a class="brand" routerLink="/admin/dashboard">
        <span class="brand-icon"><i class="pi pi-shield"></i></span>
        BloodHelp <p-tag value="Admin" severity="danger"></p-tag>
      </a>
      <nav class="desktop-nav dark">
        <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/admin/users" routerLinkActive="active">Users</a>
        <a routerLink="/admin/reports" routerLinkActive="active">Reports</a>
        <a routerLink="/admin/master-data/blood-groups" routerLinkActive="active">Master data</a>
        <a routerLink="/profile" routerLinkActive="active">My profile</a>
      </nav>
      <div class="topbar-actions">
        <p-button icon="pi pi-sign-out" severity="secondary" [text]="true" [rounded]="true" (onClick)="logout()" pTooltip="Logout" tooltipPosition="bottom" styleClass="hide-sm admin-ghost"></p-button>
        <p-button icon="pi pi-bars" severity="secondary" [outlined]="true" styleClass="mobile-btn" (onClick)="sidebar = true" ariaLabel="Open menu"></p-button>
      </div>
    </header>

    <p-sidebar [(visible)]="sidebar" position="right" styleClass="w-20rem">
      <h3 class="mt-0 mb-3">Admin menu</h3>
      <div class="flex flex-column gap-1">
        <a routerLink="/admin/dashboard" routerLinkActive="active" (click)="sidebar = false" class="side-link">Dashboard</a>
        <a routerLink="/admin/users" routerLinkActive="active" (click)="sidebar = false" class="side-link">Users</a>
        <a routerLink="/admin/reports" routerLinkActive="active" (click)="sidebar = false" class="side-link">Reports</a>
        <a routerLink="/admin/master-data/blood-groups" routerLinkActive="active" (click)="sidebar = false" class="side-link">Blood groups</a>
        <a routerLink="/admin/master-data/countries" routerLinkActive="active" (click)="sidebar = false" class="side-link">Countries</a>
        <a routerLink="/admin/master-data/country-codes" routerLinkActive="active" (click)="sidebar = false" class="side-link">Country codes</a>
        <a routerLink="/admin/master-data/states" routerLinkActive="active" (click)="sidebar = false" class="side-link">States</a>
        <a routerLink="/admin/master-data/cities" routerLinkActive="active" (click)="sidebar = false" class="side-link">Cities</a>
        <a routerLink="/profile" routerLinkActive="active" (click)="sidebar = false" class="side-link">My profile</a>
        <p-divider></p-divider>
        <p-button label="Logout" icon="pi pi-sign-out" severity="secondary" [outlined]="true" styleClass="w-full" (onClick)="logout()"></p-button>
      </div>
    </p-sidebar>

    <main class="page-wrap">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .admin-bar { background: #16161a; border-bottom-color: #000; }
      .admin-bar .brand { color: #fff; }
      .desktop-nav.dark a { color: #d4d4d8; }
      .desktop-nav.dark a:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
      .desktop-nav.dark a.active { background: #b42318; color: #fff; }
      :host ::ng-deep .admin-ghost { color: #e4e4e7 !important; }
    `,
  ],
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ErrorHandlerService);
  sidebar = false;

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
