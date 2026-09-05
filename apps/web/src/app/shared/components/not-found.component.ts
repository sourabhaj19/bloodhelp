import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedUiModule } from '../shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrap flex justify-content-center">
      <p-card styleClass="nf-card">
        <div class="text-center">
          <span class="nf-badge"><i class="pi pi-compass"></i></span>
          <h1 class="mb-1">404 — Page not found</h1>
          <p class="muted mt-0">The page you're looking for doesn't exist or was moved.</p>
          <div class="flex justify-content-center gap-2 mt-3">
            <p-button label="Go home" icon="pi pi-home" routerLink="/"></p-button>
            <p-button label="Find donors" icon="pi pi-search" severity="secondary" [outlined]="true" routerLink="/search"></p-button>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      .page-wrap { max-width: 1180px; margin: 0 auto; padding: 48px 24px; }
      .nf-card { width: min(480px, 94vw); }
      :host ::ng-deep .nf-card { border-radius: 18px; }
      :host ::ng-deep .nf-card .p-card-body { padding: 2rem; }
      .nf-badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 60px; height: 60px; border-radius: 20px;
        background: rgba(180, 35, 24, 0.1); color: #b42318; font-size: 1.7rem;
      }
      .muted { color: #667085; }
    `,
  ],
})
export class NotFoundComponent {}
