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
        <p-button icon="pi pi-bell" severity="secondary" [outlined]="true" [rounded]="true" routerLink="/notifications" pTooltip="Notifications" tooltipPosition="bottom" styleClass="hide-sm"></p-button>
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
        <a routerLink="/notifications" routerLinkActive="active" (click)="sidebar = false" class="side-link">Notifications</a>
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
})
export class UserLayoutComponent {
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
