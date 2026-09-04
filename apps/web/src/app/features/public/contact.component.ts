import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="panel" style="margin:24px 6vw"><h1>Contact</h1><p>Phase 2 — Contact placeholder. Reach us via the repository issues.</p></main>`,
})
export class ContactComponent {}
