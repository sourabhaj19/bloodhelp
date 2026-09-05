import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { MailService } from './mail.service';
import { NOTIFICATION_TYPES } from './notification-types';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';

export type TemplateVars = Record<string, any>;

function getPath(vars: TemplateVars, path: string): unknown {
  return path.split('.').reduce<unknown>((acc: any, key) => (acc == null ? acc : acc[key.trim()]), vars);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fill {{placeholders}} (dot-paths supported). HTML-escaped when `escape` is true. */
export function renderString(source: string, vars: TemplateVars, escape: boolean): string {
  return source.replace(/{{\s*([\w.]+)\s*}}/g, (_m, path: string) => {
    const value = getPath(vars, path);
    if (value == null) return '';
    return escape ? escapeHtml(value) : String(value);
  });
}

/** Sample variables used by the admin "send test" action. */
export function sampleVarsFor(type: string | null, appUrl: string): TemplateVars {
  const base = { appUrl };
  switch (type) {
    case 'PASSWORD_RESET':
      return { ...base, firstName: 'Alex', resetLink: `${appUrl}/reset-password?token=SAMPLE` };
    case 'REPORT_CREATED':
      return { ...base, reportedName: 'Jordan Doe', reportedEmail: 'jordan@example.com', reasonLabel: 'Spam', reportId: 'SAMPLE-ID' };
    case 'REPORT_STATUS_CHANGED':
      return { ...base, firstName: 'Alex', reportedName: 'Jordan Doe', statusLabel: 'Resolved', reportId: 'SAMPLE-ID' };
    case 'APPRECIATION_RECEIVED':
      return { ...base, firstName: 'Alex', senderName: 'Sam', message: 'Thank you for donating!' };
    case 'CONTACT_MESSAGE':
      return { name: 'Alex', email: 'alex@example.com', subject: 'Test subject', message: 'This is a test message.' };
    case 'CONTACT_CONFIRMATION':
      return { name: 'Alex', subject: 'Test subject' };
    case 'WELCOME':
    case 'PASSWORD_CHANGED':
    default:
      return { ...base, firstName: 'Alex' };
  }
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  list() {
    return this.prisma.emailTemplate.findMany({ orderBy: { code: 'asc' } });
  }

  async get(id: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException({ code: 'TEMPLATE_NOT_FOUND', message: 'Email template not found' });
    return tpl;
  }

  notificationTypes() {
    return NOTIFICATION_TYPES;
  }

  async create(dto: CreateEmailTemplateDto) {
    try {
      return await this.prisma.emailTemplate.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          subject: dto.subject,
          htmlBody: dto.htmlBody,
          textBody: dto.textBody || null,
          notificationType: dto.notificationType || null,
          active: dto.active ?? true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        const target = String(e.meta?.target ?? '');
        if (target.includes('notification_type')) {
          throw new ConflictException({ code: 'TEMPLATE_TYPE_MAPPED', message: 'Another template is already mapped to this notification type' });
        }
        throw new ConflictException({ code: 'TEMPLATE_DUPLICATE', message: 'A template with this code already exists' });
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    await this.get(id);
    try {
      return await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
          ...(dto.htmlBody !== undefined ? { htmlBody: dto.htmlBody } : {}),
          ...(dto.textBody !== undefined ? { textBody: dto.textBody || null } : {}),
          ...(dto.notificationType !== undefined ? { notificationType: dto.notificationType || null } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException({ code: 'TEMPLATE_TYPE_MAPPED', message: 'Another template is already mapped to this notification type' });
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.emailTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  render(tpl: { subject: string; htmlBody: string; textBody: string | null }, vars: TemplateVars) {
    return {
      subject: renderString(tpl.subject, vars, true),
      html: renderString(tpl.htmlBody, vars, true),
      text: tpl.textBody ? renderString(tpl.textBody, vars, false) : undefined,
    };
  }

  /**
   * Send the ACTIVE template mapped to a notification type. Never throws —
   * mail must not break core flows (register, reports, …).
   */
  async sendForType(
    notificationType: string,
    to: string,
    vars: TemplateVars,
  ): Promise<{ sent: boolean; skipped?: boolean; reason?: string }> {
    try {
      const tpl = await this.prisma.emailTemplate.findUnique({ where: { notificationType } });
      if (!tpl) return { sent: false, reason: 'no-template-mapped' };
      if (!tpl.active) return { sent: false, reason: 'template-inactive' };
      const rendered = this.render(tpl, { ...vars, appUrl: this.appUrl() });
      const res = await this.mail.send({ to, ...rendered });
      return { sent: !res.skipped, skipped: res.skipped };
    } catch (e) {
      this.logger.warn(`Email send failed (type=${notificationType} to=${to}): ${(e as Error).message}`);
      return { sent: false, reason: 'send-failed' };
    }
  }

  async sendTest(id: string, to: string) {
    const tpl = await this.get(id);
    const rendered = this.render(tpl, sampleVarsFor(tpl.notificationType, this.appUrl()));
    return this.mail.send({ to, ...rendered });
  }

  private appUrl(): string {
    return this.config.get<string>('app.frontendUrl', 'http://localhost:4200')!;
  }
}
