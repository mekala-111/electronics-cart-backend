import { Injectable } from '@nestjs/common';
import { LoginAttempt, RecordStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId?: string;
    identifier: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({
      data: {
        user_id: data.userId,
        identifier: data.identifier,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        success: data.success,
        failure_reason: data.failureReason,
        status: RecordStatus.active,
      },
    });
  }
}
