import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, string>;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly templatesDir: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.getOrThrow<string>('mail.from');
    this.templatesDir = join(process.cwd(), 'templates', 'email');

    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('mail.host'),
      port: this.config.getOrThrow<number>('mail.port'),
      secure: this.config.get<boolean>('mail.secure', false),
      auth: this.buildAuth(),
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const html =
      options.html ??
      (options.template
        ? await this.renderTemplate(options.template, options.context ?? {})
        : undefined);

    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html,
      text: options.text,
    });
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, string>,
  ): Promise<string> {
    const templatePath = join(this.templatesDir, `${templateName}.html`);
    let content = await readFile(templatePath, 'utf8');

    for (const [key, value] of Object.entries(context)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }

    return content;
  }

  private buildAuth(): { user: string; pass: string } | undefined {
    const user = this.config.get<string>('mail.user');
    const pass = this.config.get<string>('mail.pass');

    if (!user || !pass) {
      return undefined;
    }

    return { user, pass };
  }
}
