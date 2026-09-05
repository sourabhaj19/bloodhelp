import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/** SMTP delivery. If no SMTP host is configured, mails are logged + skipped (dev-safe). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('app.email.from', 'no-reply@example.com')!;
    const smtp = this.config.get<any>('app.email.smtp', {});
    if (smtp?.host) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port || 587,
        secure: !!smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
    } else {
      this.logger.warn('SMTP_HOST not configured — outgoing mail will be logged and skipped');
    }
  }

  get enabled(): boolean {
    return !!this.transporter;
  }

  async send(input: SendMailInput): Promise<{ skipped: boolean; messageId?: string }> {
    if (!this.transporter) {
      this.logger.log(`[mail:skipped] to=${input.to} subject=${input.subject}`);
      return { skipped: true };
    }
    const info = await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { skipped: false, messageId: info.messageId };
  }
}
