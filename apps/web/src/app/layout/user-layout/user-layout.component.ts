import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/dashboard">BloodHelp</a>
      <nav>
        <a routerLink="/dashboard">Dashboard</a>
        <a routerLink="/donors">Donors</a>
        <a routerLink="/appreciations">Thanks</a>
        <a routerLink="/notifications">Notifications</a>
        <a routerLink="/profile">Profile</a>
      </nav>
    </header>
    <main style="max-width:1180px;margin:auto;padding:24px 6vw">
      <router-outlet />
    </main>
  `,
})
export class UserLayoutComponent {}
