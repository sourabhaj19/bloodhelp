import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailTemplateService } from './email-template.service';

@Global()
@Module({
  providers: [MailService, EmailTemplateService],
  exports: [MailService, EmailTemplateService],
})
export class MailModule {}
