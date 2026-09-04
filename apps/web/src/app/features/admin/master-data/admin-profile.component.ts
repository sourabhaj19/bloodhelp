import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="panel"><h1>Admin Profile</h1><p>Admin profile — Phase 9.</p></section>`,
})
export class AdminProfileComponent {}
