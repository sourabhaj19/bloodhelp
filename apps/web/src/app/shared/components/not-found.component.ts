import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="panel" style="margin:24px 6vw;text-align:center"><h1>404 — Not Found</h1><p>The page you’re looking for doesn’t exist.</p><a routerLink="/" class="secondary">Go home</a></main>`,
})
export class NotFoundComponent {}
