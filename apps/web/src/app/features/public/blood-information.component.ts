import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="panel" style="margin:24px 6vw"><h1>Blood Information</h1><p>Educational content and blood-group master data (Phase 3) will appear here.</p></main>`,
})
export class BloodInformationComponent {}
