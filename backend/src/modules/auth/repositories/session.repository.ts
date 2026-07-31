import { Injectable } from '@nestjs/common';
import { Session, SessionStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const notDeleted = { deleted_at: null };

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    sessionTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;
    deviceType?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({
      data: {
        user_id: data.userId,
        session_token_hash: data.sessionTokenHash,
        user_agent: data.userAgent,
        ip_address: data.ipAddress,
        device_name: data.deviceName,
        device_type: data.deviceType,
        expires_at: data.expiresAt,
        status: SessionStatus.active,
      },
    });
  }

  findActiveByUser(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        user_id: userId,
        status: SessionStatus.active,
        revoked_at: null,
        expires_at: { gt: new Date() },
        ...notDeleted,
      },
      orderBy: { last_seen_at: 'desc' },
    });
  }

  findByIdForUser(sessionId: string, userId: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        user_id: userId,
        ...notDeleted,
      },
    });
  }

  revoke(sessionId: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.revoked,
        revoked_at: new Date(),
      },
    });
  }

  revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const result = this.prisma.session.updateMany({
      where: {
        user_id: userId,
        status: SessionStatus.active,
        revoked_at: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        ...notDeleted,
      },
      data: {
        status: SessionStatus.revoked,
        revoked_at: new Date(),
      },
    });

    return result.then((r) => r.count);
  }

  touchLastSeen(sessionId: string): Promise<void> {
    return this.prisma.session
      .update({
        where: { id: sessionId },
        data: { last_seen_at: new Date() },
      })
      .then(() => undefined);
  }
}
