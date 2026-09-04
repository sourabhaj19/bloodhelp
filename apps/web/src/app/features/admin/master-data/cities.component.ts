import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="panel"><h1>Master — Cities</h1><p>Admin CRUD — Phase 9.</p></section>`,
})
export class MasterCitiesComponent {}
