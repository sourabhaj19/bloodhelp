import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">BloodHelp</a>
      <nav>
        <a href="#about">About</a>
        <a href="#blood">Blood Information</a>
        <a routerLink="/login">Login</a>
      </nav>
    </header>
    <main>
      <section class="hero">
        <p class="eyebrow">Find help. Give hope.</p>
        <h1>Connect blood donors with people who need them.</h1>
        <p class="lede">A secure, privacy-aware donor platform built for real-world use.</p>
        <div class="actions">
          <button type="button" disabled>Search donors — coming in Phase 6</button>
          <a class="secondary" routerLink="/login">Login</a>
        </div>
      </section>
      <section id="about" class="panel"><h2>Built for trust</h2><p>Donor contact details will be protected by backend authorization and explicit privacy DTOs.</p></section>
      <section id="blood" class="panel"><h2>Blood information</h2><p>Master-data-driven blood groups and educational content will live here.</p></section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {}
