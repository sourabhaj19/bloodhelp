import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">BloodHelp</a>
      <nav>
        <a routerLink="/">Home</a>
        <a routerLink="/about">About</a>
        <a routerLink="/contact">Contact</a>
        <a routerLink="/blood-information">Blood Information</a>
        <a routerLink="/search">Search</a>
        <a routerLink="/login">Login</a>
        <a routerLink="/register" class="cta">Register</a>
      </nav>
    </header>
    <router-outlet />
    <footer style="text-align:center;padding:32px;color:#667085;font-size:.9rem">
      <p>&copy; {{year}} BloodHelp — Secure donor platform. OSM attribution: &copy; OpenStreetMap contributors</p>
    </footer>
  `,
  styles: [`.cta{ background:#b42318;color:white;padding:8px 14px;border-radius:999px; }`],
})
export class PublicLayoutComponent {
  year = new Date().getFullYear();
}
