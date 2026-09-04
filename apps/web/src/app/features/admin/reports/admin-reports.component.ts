import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="panel"><h1>Admin — Reports</h1><p>Reports triage workflow OPEN → UNDER_REVIEW → RESOLVED/REJECTED — Phase 8/9.</p></section>`,
})
export class AdminReportsComponent {}
