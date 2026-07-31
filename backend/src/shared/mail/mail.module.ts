import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailQueueHelper } from './mail.queue';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailService, MailQueueHelper],
  exports: [MailService, MailQueueHelper],
})
export class MailModule {}
