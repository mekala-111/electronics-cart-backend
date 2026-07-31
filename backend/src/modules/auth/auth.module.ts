import { Module } from '@nestjs/common';
import { CoreAuthModule } from '../../core/auth/core-auth.module';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { MailModule } from '../../shared/mail/mail.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { AuthController } from './controllers/auth.controller';
import { AuthEventPublisher } from './events/auth-event.publisher';
import { AuditRepository } from './repositories/audit.repository';
import { LoginAttemptRepository } from './repositories/login-attempt.repository';
import { OtpRepository } from './repositories/otp.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RoleRepository } from './repositories/role.repository';
import { SessionRepository } from './repositories/session.repository';
import { UserRepository } from './repositories/user.repository';
import { AuditService } from './services/audit.service';
import { AuthMailService } from './services/auth-mail.service';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    CoreAuthModule,
    PrismaModule,
    CacheModule,
    MailModule,
    QueueModule,
  ],
  controllers: [AuthController],
  providers: [
    UserRepository,
    RoleRepository,
    SessionRepository,
    RefreshTokenRepository,
    OtpRepository,
    LoginAttemptRepository,
    AuditRepository,
    PasswordService,
    TokenService,
    SessionService,
    OtpService,
    AuditService,
    AuthMailService,
    AuthService,
    AuthEventPublisher,
  ],
  exports: [AuthService],
})
export class AuthModule {}
