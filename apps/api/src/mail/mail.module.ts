import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
import { EmailTemplateService } from './email-template.service';

@Global()
@Module({
  providers: [MailService, SmsService, EmailTemplateService],
  exports: [MailService, SmsService, EmailTemplateService],
})
export class MailModule {}
