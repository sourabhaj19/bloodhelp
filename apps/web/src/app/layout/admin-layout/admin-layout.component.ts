import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar" style="background:#1f2937;color:white">
      <a class="brand" routerLink="/admin/dashboard" style="color:white">BloodHelp Admin</a>
      <nav>
        <a routerLink="/admin/dashboard">Dashboard</a>
        <a routerLink="/admin/users">Users</a>
        <a routerLink="/admin/reports">Reports</a>
        <a routerLink="/admin/master-data/blood-groups">Master Data</a>
        <a routerLink="/profile">My Profile</a>
      </nav>
    </header>
    <main style="max-width:1180px;margin:auto;padding:24px 6vw">
      <router-outlet />
    </main>
  `,
})
export class AdminLayoutComponent {}
