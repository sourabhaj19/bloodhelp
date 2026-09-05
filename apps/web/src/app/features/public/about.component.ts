import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrap">
      <div class="text-center mb-4">
        <p-tag value="Our mission" severity="danger"></p-tag>
        <h1 class="page-title mt-2" style="font-size: clamp(2rem, 5vw, 3rem)">No one should wait for blood.</h1>
        <p class="page-sub mx-auto" style="max-width: 640px">
          BloodHelp connects verified donors with people in urgent need — privately, quickly, and securely.
        </p>
      </div>

      <div class="grid stagger">
        <div class="col-12 md:col-4">
          <p-card styleClass="h-full text-center">
            <span class="feat-icon red anim-float"><i class="pi pi-shield"></i></span>
            <h3>Privacy first</h3>
            <p class="muted">Contact details stay hidden. The public sees masked names and approximate distance only — full details unlock for authenticated, authorized users.</p>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card styleClass="h-full text-center">
            <span class="feat-icon green anim-float" style="animation-delay: .6s"><i class="pi pi-map-marker"></i></span>
            <h3>Location smart</h3>
            <p class="muted">PostGIS-powered radius search with spatial indexing finds the nearest compatible donors in milliseconds — no client-side geo math.</p>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card styleClass="h-full text-center">
            <span class="feat-icon amber anim-float" style="animation-delay: 1.2s"><i class="pi pi-heart"></i></span>
            <h3>Community driven</h3>
            <p class="muted">Recipients thank donors, building a trusted network of repeat lifesavers — every donation is recognized.</p>
          </p-card>
        </div>
      </div>

      <p-card styleClass="mt-4">
        <div class="grid align-items-center">
          <div class="col-12 md:col-8">
            <h2 class="mt-0">How it works</h2>
            <p-steps [model]="howSteps" [readonly]="true" styleClass="mb-3"></p-steps>
            <p class="muted">Search by blood group and location, reach out to nearby donors, and say thanks afterward. Admins keep the platform safe with user and report moderation.</p>
          </div>
          <div class="col-12 md:col-4 text-center">
            <p-button label="Find donors now" icon="pi pi-search" routerLink="/search" styleClass="w-full mb-2"></p-button>
            <p-button label="Become a donor" icon="pi pi-heart" severity="secondary" [outlined]="true" routerLink="/register" styleClass="w-full"></p-button>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      .feat-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 60px; height: 60px; border-radius: 20px; font-size: 1.6rem; margin-bottom: 0.5rem;
      }
      .feat-icon.red { background: rgba(180,35,24,.1); color: #b42318; }
      .feat-icon.green { background: rgba(16,185,129,.12); color: #067647; }
      .feat-icon.amber { background: rgba(245,158,11,.15); color: #b54708; }
    `,
  ],
})
export class AboutComponent {
  howSteps = [
    { label: 'Search' },
    { label: 'Connect' },
    { label: 'Donate' },
    { label: 'Thank' },
  ];
}
