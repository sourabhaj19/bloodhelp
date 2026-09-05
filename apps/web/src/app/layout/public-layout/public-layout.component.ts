import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">
        <span class="brand-icon"><i class="pi pi-heart-fill"></i></span>
        BloodHelp
      </a>

      <nav class="desktop-nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/about" routerLinkActive="active">About</a>
        <a routerLink="/contact" routerLinkActive="active">Contact</a>
        <a routerLink="/blood-information" routerLinkActive="active">Blood Info</a>
        <a routerLink="/search" routerLinkActive="active">Find Donors</a>
      </nav>

      <div class="topbar-actions">
        <a routerLink="/login" class="login-link hide-sm">Log in</a>
        <span class="hide-sm"><p-button label="Donate now" icon="pi pi-heart" routerLink="/register"></p-button></span>
        <p-button icon="pi pi-bars" severity="secondary" [outlined]="true" styleClass="mobile-btn" (onClick)="sidebar = true" ariaLabel="Open menu"></p-button>
      </div>
    </header>

    <p-sidebar [(visible)]="sidebar" position="right" styleClass="w-20rem">
      <h3 class="mt-0 mb-3">Menu</h3>
      <div class="flex flex-column gap-1">
        <a routerLink="/" routerLinkActive="active" (click)="sidebar = false" class="side-link">Home</a>
        <a routerLink="/about" routerLinkActive="active" (click)="sidebar = false" class="side-link">About</a>
        <a routerLink="/contact" routerLinkActive="active" (click)="sidebar = false" class="side-link">Contact</a>
        <a routerLink="/blood-information" routerLinkActive="active" (click)="sidebar = false" class="side-link">Blood Information</a>
        <a routerLink="/search" routerLinkActive="active" (click)="sidebar = false" class="side-link">Find Donors</a>
        <p-divider></p-divider>
        <a routerLink="/login" (click)="sidebar = false" class="side-link">Log in</a>
        <p-button label="Donate now" icon="pi pi-heart" routerLink="/register" (onClick)="sidebar = false" styleClass="w-full mt-2"></p-button>
      </div>
    </p-sidebar>

    <div class="page-body">
      <router-outlet />
    </div>

    <footer class="footer">
      <div class="page-wrap grid" style="padding-bottom: 8px">
        <div class="col-12 md:col-4">
          <div class="brand mb-2"><span class="brand-icon"><i class="pi pi-heart-fill"></i></span>BloodHelp</div>
          <p class="muted">Connecting donors with those in need. Every donation saves lives.</p>
        </div>
        <div class="col-6 md:col-2">
          <h4>Explore</h4>
          <div class="flex flex-column gap-2">
            <a routerLink="/about">About us</a>
            <a routerLink="/contact">Contact</a>
            <a routerLink="/blood-information">Blood info</a>
            <a routerLink="/search">Find donors</a>
          </div>
        </div>
        <div class="col-6 md:col-3">
          <h4>Get started</h4>
          <div class="flex flex-column gap-2">
            <a routerLink="/login">Donor login</a>
            <a routerLink="/register">Register</a>
            <a routerLink="/forgot-password">Reset password</a>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <h4>Emergency?</h4>
          <p class="muted">Search nearby donors by blood group and city.</p>
          <p-button label="Search donors" icon="pi pi-search" severity="secondary" [outlined]="true" routerLink="/search"></p-button>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; {{ year }} BloodHelp — Secure donor platform.</span>
        <span>Map data &copy; OpenStreetMap contributors</span>
      </div>
    </footer>
  `,
  styles: [
    `
      .page-body { min-height: calc(100vh - 68px - 240px); }
      .footer h4 { margin: 0 0 0.6rem; font-size: 0.95rem; }
      .footer a { color: #475467; font-size: 0.92rem; }
      .footer a:hover { color: #b42318; }
    `,
  ],
})
export class PublicLayoutComponent {
  sidebar = false;
  year = new Date().getFullYear();
}
