import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  template: `
    <div class="page-wrap text-center">
      <p-tag value="Find help · Give hope" severity="danger"></p-tag>
      <h1 class="page-title mt-2" style="font-size: clamp(2rem, 5vw, 3rem)">Connect blood donors with people who need them.</h1>
      <p class="page-sub">A secure, privacy-aware donor platform built for real-world use.</p>
      <div class="flex justify-content-center gap-2 flex-wrap">
        <p-button label="Search donors" icon="pi pi-search" routerLink="/search"></p-button>
        <p-button label="Log in" icon="pi pi-sign-in" severity="secondary" [outlined]="true" routerLink="/login"></p-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {}
