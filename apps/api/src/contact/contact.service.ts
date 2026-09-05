import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from '../mail/email-template.service';
import { CreateContactDto } from './dto/contact.dto';

/** Contact form: mails support + sends the sender a confirmation. No DB row (stateless). */
@Injectable()
export class ContactService {
  constructor(
    private readonly templates: EmailTemplateService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: CreateContactDto) {
    const support = this.config.get<string>('app.email.supportEmail', 'support@example.com')!;
    const vars = { name: dto.name.trim(), email: dto.email.trim(), subject: dto.subject.trim(), message: dto.message.trim() };
    // Support copy first (most important), then sender confirmation — both best-effort
    await this.templates.sendForType('CONTACT_MESSAGE', support, vars);
    await this.templates.sendForType('CONTACT_CONFIRMATION', vars.email, { name: vars.name, subject: vars.subject });
    return { received: true };
  }
}
