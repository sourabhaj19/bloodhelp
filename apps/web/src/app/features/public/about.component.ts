import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="panel" style="margin:24px 6vw"><h1>About BloodHelp</h1><p>Phase 2 — About content placeholder. The platform modular monolith architecture is documented in 01-architecture.md §1.</p></main>`,
})
export class AboutComponent {}
