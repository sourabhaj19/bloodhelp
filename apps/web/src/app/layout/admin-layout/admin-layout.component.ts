import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MenuItem } from 'primeng/api';
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
        <a routerLink="/admin/email-templates" routerLinkActive="active">Emails</a>
        <button type="button" class="nav-drop" [class.active]="isMasterData" (click)="mdMenu.toggle($event)">
          Master data <i class="pi pi-chevron-down ml-1"></i>
        </button>
        <a routerLink="/admin/profile" routerLinkActive="active">My profile</a>
      </nav>
      <p-menu #mdMenu [model]="mdItems" [popup]="true"></p-menu>
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
        <a routerLink="/admin/email-templates" routerLinkActive="active" (click)="sidebar = false" class="side-link">Email templates</a>
        <a routerLink="/admin/master-data/blood-groups" routerLinkActive="active" (click)="sidebar = false" class="side-link">Blood groups</a>
        <a routerLink="/admin/master-data/countries" routerLinkActive="active" (click)="sidebar = false" class="side-link">Countries</a>
        <a routerLink="/admin/master-data/country-codes" routerLinkActive="active" (click)="sidebar = false" class="side-link">Country codes</a>
        <a routerLink="/admin/master-data/states" routerLinkActive="active" (click)="sidebar = false" class="side-link">States</a>
        <a routerLink="/admin/master-data/cities" routerLinkActive="active" (click)="sidebar = false" class="side-link">Cities</a>
        <a routerLink="/admin/profile" routerLinkActive="active" (click)="sidebar = false" class="side-link">My profile</a>
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
      .nav-drop {
        background: transparent;
        border: 0;
        cursor: pointer;
        padding: 9px 14px;
        border-radius: 10px;
        color: #d4d4d8;
        font-weight: 600;
        font-size: 0.93rem;
        font-family: inherit;
        display: inline-flex;
        align-items: center;
      }
      .nav-drop:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
      .nav-drop.active { background: #b42318; color: #fff; }
      .nav-drop .pi { font-size: 0.7rem; }
      :host ::ng-deep .admin-ghost { color: #e4e4e7 !important; }
    `,
  ],
})
export class AdminLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);

  sidebar = false;
  isMasterData = false;

  mdItems: MenuItem[] = [
    { label: 'Blood groups', icon: 'pi pi-heart', routerLink: '/admin/master-data/blood-groups' },
    { label: 'Country codes', icon: 'pi pi-phone', routerLink: '/admin/master-data/country-codes' },
    { label: 'Countries', icon: 'pi pi-globe', routerLink: '/admin/master-data/countries' },
    { label: 'States', icon: 'pi pi-map', routerLink: '/admin/master-data/states' },
    { label: 'Cities', icon: 'pi pi-building', routerLink: '/admin/master-data/cities' },
  ];

  ngOnInit() {
    this.isMasterData = this.router.url.startsWith('/admin/master-data');
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.isMasterData = (e as NavigationEnd).urlAfterRedirects.startsWith('/admin/master-data');
      this.cdr.markForCheck();
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
