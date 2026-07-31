import { Injectable } from '@nestjs/common';
import { Otp, OtpChannel, OtpPurpose, RecordStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const notDeleted = { deleted_at: null };

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId?: string;
    destination: string;
    channel: OtpChannel;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
    maxAttempts?: number;
  }): Promise<Otp> {
    return this.prisma.otp.create({
      data: {
        user_id: data.userId,
        destination: data.destination,
        channel: data.channel,
        purpose: data.purpose,
        code_hash: data.codeHash,
        expires_at: data.expiresAt,
        max_attempts: data.maxAttempts ?? 5,
        status: RecordStatus.active,
      },
    });
  }

  findLatestActive(
    destination: string,
    purpose: OtpPurpose,
  ): Promise<Otp | null> {
    return this.prisma.otp.findFirst({
      where: {
        destination,
        purpose,
        consumed_at: null,
        status: RecordStatus.active,
        expires_at: { gt: new Date() },
        ...notDeleted,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  consume(id: string): Promise<Otp> {
    return this.prisma.otp.update({
      where: { id },
      data: {
        consumed_at: new Date(),
        status: RecordStatus.inactive,
      },
    });
  }

  incrementAttempts(id: string): Promise<Otp> {
    return this.prisma.otp.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }
}
