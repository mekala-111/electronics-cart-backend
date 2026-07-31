import { Injectable, Logger } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { MailQueueHelper } from '../../../shared/mail/mail.queue';
import { MailService } from '../../../shared/mail/mail.service';

@Injectable()
export class AuthMailService {
  private readonly logger = new Logger(AuthMailService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly mailQueueHelper: MailQueueHelper,
  ) {}

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    await this.send('verify-email', email, 'Verify your email', {
      code,
      email,
    });
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    await this.send('reset-password', email, 'Reset your password', {
      code,
      email,
    });
  }

  async sendOtpEmail(email: string, code: string, purpose: OtpPurpose): Promise<void> {
    await this.send('otp', email, `Your verification code (${purpose})`, {
      code,
      email,
      purpose,
    });
  }

  private async send(
    template: string,
    to: string,
    subject: string,
    context: Record<string, string>,
  ): Promise<void> {
    const payload = { to, subject, template, context };

    try {
      await this.mailQueueHelper.enqueueEmail(`auth.${template}`, payload);
    } catch {
      this.logger.warn(`Queue unavailable for ${template}; sending synchronously`);
      await this.mailService.sendMail(payload);
    }
  }
}
