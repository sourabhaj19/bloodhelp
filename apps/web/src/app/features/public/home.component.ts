import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrap">
      <div class="hero-card">
        <div class="grid align-items-center">
          <div class="col-12 lg:col-7">
            <p-tag value="Find help · Give hope" severity="danger"></p-tag>
            <h1 class="hero-title">Connect blood donors with people who need them.</h1>
            <p class="hero-sub">
              A secure, privacy-aware donor platform. Donor contact details are protected by
              backend authorization — the public only ever sees masked, approximate results.
            </p>
            <div class="flex flex-wrap gap-2 mt-3">
              <p-button label="Search donors" icon="pi pi-search" routerLink="/search"></p-button>
              <p-button label="Become a donor" icon="pi pi-heart" severity="secondary" [outlined]="true" routerLink="/register"></p-button>
            </div>
            <div class="flex flex-wrap gap-4 mt-4 stats">
              <div><div class="stat-n">8</div><div class="stat-l">Blood groups</div></div>
              <div><div class="stat-n">PostGIS</div><div class="stat-l">Radius search</div></div>
              <div><div class="stat-n">Private</div><div class="stat-l">PII by default</div></div>
            </div>
          </div>
          <div class="col-12 lg:col-5">
            <p-card styleClass="donate-card">
              <div class="flex align-items-center gap-3">
                <span class="drop"><i class="pi pi-heart-fill"></i></span>
                <div>
                  <div class="font-bold text-xl">Your donation saves lives</div>
                  <div class="muted">One donation can help up to three people.</div>
                </div>
              </div>
              <p-divider></p-divider>
              <div class="flex flex-column gap-2">
                <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Free to join, always</div>
                <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Your contact stays private until you choose</div>
                <div class="flex align-items-center gap-2"><i class="pi pi-check-circle ok"></i> Get thanked by recipients</div>
              </div>
              <p-button label="Register in 2 minutes" icon="pi pi-arrow-right" iconPos="right" routerLink="/register" styleClass="w-full mt-3"></p-button>
            </p-card>
          </div>
        </div>
      </div>

      <div class="grid mt-3">
        <div class="col-12 md:col-4">
          <p-card header="Built for trust" subheader="Privacy-first design">
            <p class="muted mt-0">Distance search uses PostGIS ST_DWithin with GIST indexing — no client-side geo math, no data leakage.</p>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card header="Blood information" subheader="Learn before you donate">
            <p class="muted mt-0">Master-data-driven blood groups and eligibility guidance.</p>
            <p-button label="Learn more" icon="pi pi-book" severity="secondary" [outlined]="true" routerLink="/blood-information" size="small"></p-button>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card header="For hospitals & NGOs" subheader="Verified access">
            <p class="muted mt-0">Authenticated, tiered DTOs reveal contact details only to authorized users.</p>
            <p-button label="Log in" icon="pi pi-sign-in" severity="secondary" [outlined]="true" routerLink="/login" size="small"></p-button>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-wrap { max-width: 1180px; margin: 0 auto; padding: 24px; }
      .hero-card {
        background: linear-gradient(135deg, #fff 0%, #fef2f2 60%, #ffedd5 100%);
        border: 1px solid #f3e2df; border-radius: 24px; padding: 2.2rem;
      }
      .hero-title { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.02; letter-spacing: -0.04em; margin: 0.8rem 0; }
      .hero-sub { color: #475467; font-size: 1.08rem; max-width: 560px; }
      .stats .stat-n { font-weight: 800; font-size: 1.15rem; }
      .stats .stat-l { color: #667085; font-size: 0.85rem; }
      .donate-card { border-radius: 20px; }
      .drop {
        display: inline-flex; align-items: center; justify-content: center;
        width: 52px; height: 52px; border-radius: 16px; background: #b42318; color: #fff; font-size: 1.4rem;
      }
      .muted { color: #667085; }
      .ok { color: #067647; }
      @media (max-width: 720px) { .hero-card { padding: 1.4rem; } }
    `,
  ],
})
export class HomeComponent {}
