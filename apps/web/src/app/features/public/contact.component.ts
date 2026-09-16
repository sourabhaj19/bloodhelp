import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SharedUiModule } from '../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [RouterLink, SharedUiModule],
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
                <div><div class="font-bold">Emergency helpline</div><div class="muted"><a routerLink="/search" class="link">Use donor search</a> for urgent needs</div></div>
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
            <p-message *ngIf="sent" severity="success" [text]="sent" styleClass="w-full mb-3"></p-message>
            <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>
            <form (ngSubmit)="send(f)" #f="ngForm" class="formgrid grid">
              <div class="field col-12 md:col-6">
                <label for="name">Name</label>
                <input pInputText id="name" [(ngModel)]="form.name" name="name" required minlength="2" maxlength="100" class="w-full" placeholder="Your name" autocomplete="name" #nameCtrl="ngModel" />
                <small class="p-error" *ngIf="nameCtrl.invalid && nameCtrl.touched">Name must be 2–100 characters</small>
              </div>
              <div class="field col-12 md:col-6">
                <label for="email">Email</label>
                <input pInputText id="email" [(ngModel)]="form.email" name="email" type="email" required email maxlength="254" class="w-full" placeholder="you@example.com" autocomplete="email" #emailCtrl="ngModel" />
                <small class="p-error" *ngIf="emailCtrl.invalid && emailCtrl.touched">Enter a valid email address</small>
              </div>
              <div class="field col-12">
                <label for="subject">Subject</label>
                <p-dropdown inputId="subject" [(ngModel)]="form.subject" name="subject" [options]="subjects" placeholder="Choose a topic" styleClass="w-full" required #subjectCtrl="ngModel"></p-dropdown>
                <small class="p-error" *ngIf="subjectCtrl.invalid && subjectCtrl.touched">Please choose a topic</small>
              </div>
              <div class="field col-12">
                <label for="msg">Message</label>
                <textarea pInputTextarea id="msg" [(ngModel)]="form.message" name="message" rows="5" required minlength="10" maxlength="2000" class="w-full" placeholder="How can we help?" #msgCtrl="ngModel"></textarea>
                <div class="flex justify-content-between">
                  <small class="p-error" *ngIf="msgCtrl.invalid && msgCtrl.touched">Message must be 10–2000 characters</small>
                  <small class="muted ml-auto">{{ form.message.length }}/2000</small>
                </div>
              </div>
              <div class="col-12">
                <p-button type="submit" label="Send message" icon="pi pi-send" [loading]="sending" [disabled]="f.invalid || sending" styleClass="w-full md:w-auto"></p-button>
              </div>
            </form>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-wrap { max-width: 1180px; margin: 0 auto; padding: 24px; }
      .page-title { margin: 0; font-size: 1.9rem; letter-spacing: -0.02em; }
      .page-sub { color: #667085; margin: 0.2rem 0 0; }
      .link { color: #b42318; font-weight: 600; }
      .link:hover { text-decoration: underline; }
      .c-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 46px; height: 46px; border-radius: 14px; font-size: 1.2rem; flex-shrink: 0;
      }
      .c-icon.red { background: rgba(180,35,24,.1); color: #b42318; }
      .c-icon.green { background: rgba(16,185,129,.12); color: #067647; }
      .c-icon.amber { background: rgba(245,158,11,.15); color: #b54708; }
      .muted { color: #98a2b3; }
    `,
  ],
})
export class ContactComponent {
  private http = inject(HttpClient);
  private toast = inject(ErrorHandlerService);
  private cdr = inject(ChangeDetectorRef);
  subjects = ['General question', 'Report an issue', 'Partnership (hospital / NGO)', 'Privacy request', 'Other'];
  form = { name: '', email: '', subject: '', message: '' };
  sent = '';
  error = '';
  sending = false;

  async send(f?: any) {
    if (f?.invalid) {
      Object.values(f.controls ?? {}).forEach((c: any) => c?.markAsTouched?.());
      this.cdr.markForCheck();
      return;
    }
    this.sent = '';
    this.error = '';
    this.sending = true;
    try {
      const r: any = await firstValueFrom(this.http.post<any>('/api/contact', this.form));
      this.sent = r.message ?? 'Message received. We will get back to you soon.';
      this.toast.showSuccess('Message sent! Check your inbox for a confirmation.');
      this.form = { name: '', email: '', subject: '', message: '' };
      f?.resetForm?.({ name: '', email: '', subject: '', message: '' });
    } catch (e: any) {
      this.error = this.toast.getUserMessage(e);
      // Banner only — no duplicate toast for same error (was handleHttpError + getUserMessage)
    } finally {
      this.sending = false;
      this.cdr.markForCheck();
    }
  }
}
