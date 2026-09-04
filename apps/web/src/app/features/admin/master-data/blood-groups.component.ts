import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="panel"><h1>Master — Blood Groups</h1><p>CRUD, DELETE blocked 409 if referenced — Phase 9.</p></section>`,
})
export class MasterBloodGroupsComponent {}
