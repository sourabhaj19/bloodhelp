import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { SharedUiModule } from '../../../shared/shared-ui.module';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  standalone: true,
  imports: [SharedUiModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
      <div>
        <h1 class="page-title">Email templates</h1>
        <p class="page-sub">Bodies support {{'{{'}}variable{{'}}'}} placeholders. Map one active template per notification type.</p>
      </div>
      <p-button label="New template" icon="pi pi-plus" (onClick)="openNew()"></p-button>
    </div>

    <p-message *ngIf="error" severity="error" [text]="error" styleClass="w-full mb-3"></p-message>

    <p-card *ngIf="loading" header="Loading…">
      <p-skeleton height="3rem" styleClass="mb-2" *ngFor="let i of [1, 2, 3]"></p-skeleton>
    </p-card>

    <p-card *ngIf="!loading" header="All templates" [subheader]="rows.length + ' record(s)'">
      <p-table [value]="rows" styleClass="p-datatable-sm" responsiveLayout="scroll" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]">
        <ng-template pTemplate="header">
          <tr><th>Name</th><th>Code</th><th>Mapped to</th><th>Status</th><th style="width: 210px"></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-t>
          <tr>
            <td><strong>{{ t.name }}</strong><div class="muted text-sm">{{ t.subject }}</div></td>
            <td><p-tag [value]="t.code" severity="info"></p-tag></td>
            <td><p-tag *ngIf="t.notificationType" [value]="t.notificationType" severity="success"></p-tag><span *ngIf="!t.notificationType" class="muted">—</span></td>
            <td><p-tag [value]="t.active ? 'Active' : 'Inactive'" [severity]="t.active ? 'success' : 'warning'"></p-tag></td>
            <td>
              <div class="flex gap-2">
                <p-button icon="pi pi-send" size="small" severity="secondary" [outlined]="true" (onClick)="openTest(t)" pTooltip="Send test"></p-button>
                <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="openEdit(t)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="askDelete(t)" pTooltip="Delete"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="text-center muted">No templates yet. Run the database seed or create one.</td></tr>
        </ng-template>
      </p-table>
    </p-card>

    <p-dialog [(visible)]="dialog" [header]="editing ? 'Edit template' : 'New template'" [modal]="true" [style]="{ width: 'min(640px, 96vw)' }">
      <div class="flex flex-column gap-3">
        <div class="formgrid grid">
          <div class="field col-12 md:col-6 mb-0">
            <label for="name">Name</label>
            <input pInputText id="name" [(ngModel)]="form.name" class="w-full" maxlength="100" />
          </div>
          <div class="field col-12 md:col-6 mb-0">
            <label for="code">Code</label>
            <input pInputText id="code" [(ngModel)]="form.code" class="w-full uppercase" placeholder="E.g. DONOR_REMINDER" maxlength="50" [disabled]="!!editing" />
            <small *ngIf="editing" class="hint">Code cannot be changed after creation.</small>
          </div>
        </div>
        <div class="field mb-0">
          <label for="subject">Subject</label>
          <input pInputText id="subject" [(ngModel)]="form.subject" class="w-full" maxlength="255" />
        </div>
        <div class="field mb-0">
          <label for="ntype">Mapped notification type</label>
          <p-dropdown inputId="ntype" [(ngModel)]="form.notificationType" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="None (unmapped)" [showClear]="true" [appendTo]="'body'" styleClass="w-full"></p-dropdown>
          <small class="hint" *ngIf="mappedVars().length">Available variables: {{ mappedVars().join(', ') }}</small>
          <small class="hint" *ngIf="!mappedVars().length">One template per type — mapping a second one fails with a clear error.</small>
        </div>
        <div class="field mb-0">
          <label for="html">HTML body</label>
          <textarea pInputTextarea id="html" [(ngModel)]="form.htmlBody" rows="7" class="w-full mono" placeholder="<p>Hi {{'{{'}}firstName{{'}}'}}, ...</p>"></textarea>
        </div>
        <div class="field mb-0">
          <label for="text">Plain-text body (optional)</label>
          <textarea pInputTextarea id="text" [(ngModel)]="form.textBody" rows="4" class="w-full mono"></textarea>
        </div>
        <div class="flex align-items-center justify-content-between">
          <label for="active" class="font-bold">Active</label>
          <p-inputSwitch inputId="active" [(ngModel)]="form.active"></p-inputSwitch>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="dialog = false"></p-button>
        <p-button [label]="editing ? 'Save' : 'Create'" icon="pi pi-check" (onClick)="save()" [loading]="saving" [disabled]="!valid()"></p-button>
      </ng-template>
    </p-dialog>

    <p-dialog [(visible)]="testDialog" header="Send test email" [modal]="true" [style]="{ width: 'min(420px, 94vw)' }">
      <p class="mt-0">Renders <strong>{{ testing?.code }}</strong> with sample data and sends it.</p>
      <div class="field mb-0">
        <label for="to">Recipient</label>
        <input pInputText id="to" [(ngModel)]="testTo" type="email" class="w-full" placeholder="you@example.com" />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="testDialog = false"></p-button>
        <p-button label="Send" icon="pi pi-send" (onClick)="sendTest()" [loading]="testing_" [disabled]="!testTo.trim()"></p-button>
      </ng-template>
    </p-dialog>

    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    ` .muted { color: #98a2b3; } .uppercase { text-transform: uppercase; } .hint { color: #98a2b3; font-size: .78rem; } .mono { font-family: ui-monospace, monospace; font-size: .85rem; } .field label { display: block; margin-bottom: .45rem; font-weight: 700; font-size: .87rem; color: #344054; } `,
  ],
})
export class EmailTemplatesComponent implements OnInit {
  private http = inject(HttpClient);
  private errors = inject(ErrorHandlerService);
  private confirm = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  rows: any[] = [];
  types: any[] = [];
  typeOptions: any[] = [];
  loading = true;
  saving = false;
  error = '';
  dialog = false;
  editing: any = null;
  form: any = { name: '', code: '', subject: '', htmlBody: '', textBody: '', notificationType: '', active: true };

  testDialog = false;
  testing: any = null;
  testing_ = false;
  testTo = '';

  ngOnInit() {
    this.http.get<any>('/api/admin/email-templates/notification-types').subscribe({
      next: (r) => {
        this.types = r.data ?? r ?? [];
        this.typeOptions = this.types.map((t: any) => ({ label: `${t.type} — ${t.description}`, value: t.type }));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.load();
  }

  mappedVars(): string[] {
    return this.types.find((t: any) => t.type === this.form.notificationType)?.variables ?? [];
  }

  load() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.http.get<any>('/api/admin/email-templates').subscribe({
      next: (r) => { this.rows = r.data ?? r ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = this.errors.getUserMessage(e); this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openNew() {
    this.editing = null;
    this.form = { name: '', code: '', subject: '', htmlBody: '', textBody: '', notificationType: '', active: true };
    this.dialog = true;
  }

  openEdit(t: any) {
    this.editing = t;
    this.form = { name: t.name, code: t.code, subject: t.subject, htmlBody: t.htmlBody, textBody: t.textBody || '', notificationType: t.notificationType || '', active: !!t.active };
    this.dialog = true;
  }

  valid(): boolean {
    return !!(this.form.name?.trim() && this.form.code?.trim() && this.form.subject?.trim() && this.form.htmlBody?.trim());
  }

  payload() {
    const p: any = {
      name: this.form.name.trim(),
      subject: this.form.subject.trim(),
      htmlBody: this.form.htmlBody,
      active: !!this.form.active,
    };
    if (!this.editing) p.code = this.form.code.trim().toUpperCase();
    p.notificationType = this.form.notificationType || null;
    p.textBody = this.form.textBody?.trim() ? this.form.textBody : null;
    return p;
  }

  save() {
    this.saving = true;
    const req = this.editing
      ? this.http.patch<any>(`/api/admin/email-templates/${this.editing.id}`, this.payload())
      : this.http.post<any>('/api/admin/email-templates', this.payload());
    req.subscribe({
      next: () => {
        this.errors.showSuccess(this.editing ? 'Template updated.' : 'Template created.');
        this.dialog = false;
        this.saving = false;
        this.load();
      },
      error: (e) => {
        this.errors.handleHttpError(e, 'Save failed');
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  askDelete(t: any) {
    this.confirm.confirm({
      message: `Delete template ${t.code}? Mapped notification types will stop sending email until remapped.`,
      header: 'Delete template',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`/api/admin/email-templates/${t.id}`).subscribe({
          next: () => { this.errors.showSuccess('Template deleted.'); this.load(); },
          error: (e) => this.errors.handleHttpError(e, 'Delete failed'),
        });
      },
    });
  }

  openTest(t: any) {
    this.testing = t;
    this.testTo = '';
    this.testDialog = true;
  }

  sendTest() {
    if (!this.testing || !this.testTo.trim()) return;
    this.testing_ = true;
    this.http.post<any>(`/api/admin/email-templates/${this.testing.id}/test`, { to: this.testTo.trim() }).subscribe({
      next: (r) => {
        const skipped = (r.data ?? r)?.skipped;
        if (skipped) this.errors.showWarn('No SMTP configured — test was logged, not sent.');
        else this.errors.showSuccess(`Test email sent to ${this.testTo.trim()}.`);
        this.testDialog = false;
        this.testing_ = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.errors.handleHttpError(e, 'Test send failed');
        this.testing_ = false;
        this.cdr.markForCheck();
      },
    });
  }
}
