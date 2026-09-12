import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedUiModule } from '../../shared/shared-ui.module';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrap">
      <div class="text-center mb-4">
        <p-tag value="Donor education" severity="danger"></p-tag>
        <h1 class="page-title mt-2">Blood information</h1>
        <p class="page-sub mx-auto" style="max-width: 640px">Know your group, who you can help, and how to donate safely.</p>
      </div>

      <p-card header="Who can donate to whom?" subheader="Red blood cell compatibility" styleClass="mb-3">
        <p-table [value]="compatibility" styleClass="p-datatable-sm" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr><th>Blood group</th><th>Can donate to</th><th>Can receive from</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td><p-tag [value]="r.group" severity="danger"></p-tag></td>
              <td>{{ r.to }}</td>
              <td>{{ r.from }}</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <div class="grid stagger">
        <div class="col-12 md:col-6">
          <p-card header="Eligibility basics">
            <h4 class="mt-0 mb-2">Basic requirements</h4>
            <div class="flex flex-column gap-2">
              <div class="flex align-items-start gap-2"><i class="pi pi-check-circle ok mt-1"></i> <span><strong>Age:</strong> 18 to 65 years old</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-check-circle ok mt-1"></i> <span><strong>Weight:</strong> minimum 45 kg</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-check-circle ok mt-1"></i> <span><strong>General health:</strong> feel well, physically fit, with no active infections, colds, or fevers on donation day</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-check-circle ok mt-1"></i> <span><strong>Hemoglobin:</strong> at least 12.5 g/dL</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-check-circle ok mt-1"></i> <span><strong>Vital signs:</strong> blood pressure, pulse rate, and body temperature within normal ranges</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-check-circle ok mt-1"></i> <span>3 months since last donation</span></div>
            </div>
            <h4 class="mb-2 mt-3">Important restrictions — please skip / defer if</h4>
            <div class="flex flex-column gap-2">
              <div class="flex align-items-start gap-2"><i class="pi pi-times-circle no mt-1"></i> <span>You have fever, infection, cold, or recent surgery</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-times-circle no mt-1"></i> <span><strong>Medications:</strong> on antibiotics or active treatment for an acute illness</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-times-circle no mt-1"></i> <span><strong>Tattoos / piercings:</strong> wait 3–12 months after a new tattoo or piercing (per local guidelines)</span></div>
              <div class="flex align-items-start gap-2"><i class="pi pi-times-circle no mt-1"></i> <span><strong>Pregnancy:</strong> cannot donate while pregnant or breastfeeding</span></div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6">
          <p-card header="On donation day">
            <p-accordion>
              <p-accordionTab header="Before">
                <p class="muted mt-0">Sleep well, eat a light meal, drink water, and carry an ID. Avoid alcohol for 24 hours.</p>
              </p-accordionTab>
              <p-accordionTab header="During">
                <p class="muted mt-0">The process takes about 10–15 minutes. Tell staff immediately if you feel dizzy.</p>
              </p-accordionTab>
              <p-accordionTab header="After">
                <p class="muted mt-0">Rest 10–15 minutes, drink fluids, avoid heavy lifting for a day. One donation helps up to three people.</p>
              </p-accordionTab>
            </p-accordion>
            <p-button label="Check if you're eligible — register" icon="pi pi-arrow-right" iconPos="right" routerLink="/register" styleClass="w-full mt-3"></p-button>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .ok { color: #067647; }
      .no { color: #b42318; }
    `,
  ],
})
export class BloodInformationComponent {
  compatibility = [
    { group: 'O−', to: 'Everyone (universal donor)', from: 'O−' },
    { group: 'O+', to: 'O+, A+, B+, AB+', from: 'O−, O+' },
    { group: 'A−', to: 'A−, A+, AB−, AB+', from: 'O−, A−' },
    { group: 'A+', to: 'A+, AB+', from: 'O−, O+, A−, A+' },
    { group: 'B−', to: 'B−, B+, AB−, AB+', from: 'O−, B−' },
    { group: 'B+', to: 'B+, AB+', from: 'O−, O+, B−, B+' },
    { group: 'AB−', to: 'AB−, AB+', from: 'O−, A−, B−, AB−' },
    { group: 'AB+', to: 'AB+ (universal recipient)', from: 'Everyone' },
  ];
}
