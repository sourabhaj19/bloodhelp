import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrap">
      <div class="text-center mb-4">
        <p-tag value="We're here to help" severity="danger"></p-tag>
        <h1 class="page-title mt-2">Contact us</h1>
        <p class="page-sub">Questions, feedback, or partnership ideas — send us a message.</p>
      </div>

      <div class="grid">
        <div class="col-12 md:col-4">
          <div class="flex flex-column gap-3 stagger">
            <p-card>
              <div class="flex align-items-center gap-3">
                <span class="c-icon red"><i class="pi pi-envelope"></i></span>
                <div><div class="font-bold">Email</div><div class="muted">support&#64;bloodhelp.org</div></div>
              </div>
            </p-card>
            <p-card>
              <div class="flex align-items-center gap-3">
                <span class="c-icon green"><i class="pi pi-phone"></i></span>
                <div><div class="font-bold">Emergency helpline</div><div class="muted">Use donor search for urgent needs</div></div>
              </div>
            </p-card>
            <p-card>
              <div class="flex align-items-center gap-3">
                <span class="c-icon amber"><i class="pi pi-github"></i></span>
                <div><div class="font-bold">Open source</div><div class="muted">Report issues on the repository</div></div>
              </div>
            </p-card>
          </div>
        </div>
        <div class="col-12 md:col-8">
          <p-card header="Send a message" subheader="We usually reply within 2 working days">
            <p-message *ngIf="sent" severity="success" text="Message noted! We'll get back to you soon." styleClass="w-full mb-3"></p-message>
            <form (ngSubmit)="send()" #f="ngForm" class="formgrid grid">
              <div class="field col-12 md:col-6">
                <label for="name">Name</label>
                <input pInputText id="name" [(ngModel)]="form.name" name="name" required class="w-full" placeholder="Your name" />
              </div>
              <div class="field col-12 md:col-6">
                <label for="email">Email</label>
                <input pInputText id="email" [(ngModel)]="form.email" name="email" type="email" required email class="w-full" placeholder="you@example.com" />
              </div>
              <div class="field col-12">
                <label for="subject">Subject</label>
                <p-dropdown inputId="subject" [(ngModel)]="form.subject" name="subject" [options]="subjects" placeholder="Choose a topic" styleClass="w-full" required></p-dropdown>
              </div>
              <div class="field col-12">
                <label for="msg">Message</label>
                <textarea pInputTextarea id="msg" [(ngModel)]="form.message" name="message" rows="5" required class="w-full" placeholder="How can we help?"></textarea>
              </div>
              <div class="col-12">
                <p-button type="submit" label="Send message" icon="pi pi-send" [disabled]="f.invalid" styleClass="w-full md:w-auto"></p-button>
              </div>
            </form>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .c-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 46px; height: 46px; border-radius: 14px; font-size: 1.2rem; flex-shrink: 0;
      }
      .c-icon.red { background: rgba(180,35,24,.1); color: #b42318; }
      .c-icon.green { background: rgba(16,185,129,.12); color: #067647; }
      .c-icon.amber { background: rgba(245,158,11,.15); color: #b54708; }
    `,
  ],
})
export class ContactComponent {
  private toast = inject(ErrorHandlerService);
  subjects = ['General question', 'Report an issue', 'Partnership (hospital / NGO)', 'Privacy request', 'Other'];
  form = { name: '', email: '', subject: '', message: '' };
  sent = false;

  send() {
    this.sent = true;
    this.toast.showSuccess('Thanks for reaching out! We will reply soon.');
    this.form = { name: '', email: '', subject: '', message: '' };
    setTimeout(() => (this.sent = false), 6000);
  }
}
