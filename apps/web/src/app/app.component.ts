import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SharedUiModule } from './shared/shared-ui.module';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SharedUiModule],
  template: `
    <router-outlet />
    <p-toast position="top-right" [breakpoints]="{ '640px': { width: '92vw' } }"></p-toast>
    <p-confirmDialog></p-confirmDialog>
    <div *ngIf="loading.isLoading()" class="global-loading-overlay">
      <p-progressSpinner strokeWidth="4" styleClass="w-3rem h-3rem"></p-progressSpinner>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  loading = inject(LoadingService);
}
