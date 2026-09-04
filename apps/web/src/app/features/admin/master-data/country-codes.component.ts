import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="panel"><h1>Master — Country Codes</h1><p>Admin master data CRUD — Phase 9.</p></section>`,
})
export class MasterCountryCodesComponent {}
