import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SMS sender. Default provider is 'log' (prints to server logs, dev-safe).
 * Wire a real provider (Twilio / MSG91 / …) behind SMS_PROVIDER later —
 * callers use the same sendSms() contract.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  get provider(): string {
    return this.config.get<string>('app.sms.provider', 'log')!;
  }

  async sendSms(to: string, text: string): Promise<{ skipped: boolean; provider: string }> {
    if (this.provider === 'log') {
      this.logger.log(`[sms:log] to=${to} text=${text}`);
      return { skipped: true, provider: 'log' };
    }
    this.logger.warn(`SMS provider '${this.provider}' not implemented — logging instead. to=${to} text=${text}`);
    return { skipped: true, provider: this.provider };
  }
}
