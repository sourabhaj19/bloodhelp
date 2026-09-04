import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <section class="hero">
        <p class="eyebrow">Find help. Give hope.</p>
        <h1>Connect blood donors with people who need them.</h1>
        <p class="lede">A secure, privacy-aware donor platform built for real-world use. Donor contact details are protected by backend authorization and explicit privacy DTOs.</p>
        <div class="actions">
          <a routerLink="/search" class="secondary" style="background:#b42318;color:white">Search donors</a>
          <a class="secondary" routerLink="/register">Become a donor</a>
        </div>
      </section>
      <section id="about" class="panel"><h2>Built for trust</h2><p>Phase 2 foundation is live. Distance search uses PostGIS ST_DWithin with GIST indexing — no client-side geo math.</p></section>
      <section id="blood" class="panel"><h2>Blood information</h2><p>Master-data-driven blood groups and educational content — Phase 3.</p></section>
    </main>
  `,
})
export class HomeComponent {}
