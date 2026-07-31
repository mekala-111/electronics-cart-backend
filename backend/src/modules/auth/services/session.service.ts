import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
import { hashToken, randomToken } from '../../../common/utils/crypto.util';
import { addDays } from '../../../common/utils/date.util';
import { SESSION_DAYS } from '../constants/auth.constants';
import { SessionRepository } from '../repositories/session.repository';
import { RequestMeta } from '../utils/request-meta.util';

export interface SessionSummary {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: Date;
  expiresAt: Date;
  createdAt: Date;
  current: boolean;
}

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async createSession(
    userId: string,
    meta: RequestMeta,
  ): Promise<{ session: Session; sessionTokenHash: string }> {
    const rawToken = randomToken(32);
    const sessionTokenHash = hashToken(rawToken);
    const expiresAt = addDays(new Date(), SESSION_DAYS);

    const session = await this.sessionRepository.create({
      userId,
      sessionTokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      deviceName: this.parseDeviceName(meta.userAgent),
      deviceType: this.parseDeviceType(meta.userAgent),
      expiresAt,
    });

    return { session, sessionTokenHash };
  }

  async listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionSummary[]> {
    const sessions = await this.sessionRepository.findActiveByUser(userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.device_name,
      deviceType: session.device_type,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      lastSeenAt: session.last_seen_at,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      current: session.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findByIdForUser(
      sessionId,
      userId,
    );
    if (!session || session.revoked_at) {
      return;
    }
    await this.sessionRepository.revoke(sessionId);
  }

  async revokeAll(userId: string, exceptSessionId?: string): Promise<number> {
    return this.sessionRepository.revokeAllForUser(userId, exceptSessionId);
  }

  private parseDeviceName(userAgent?: string): string | undefined {
    if (!userAgent) {
      return undefined;
    }
    if (/mobile/i.test(userAgent)) {
      return 'Mobile';
    }
    if (/tablet/i.test(userAgent)) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  private parseDeviceType(userAgent?: string): string | undefined {
    if (!userAgent) {
      return undefined;
    }
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    if (/iphone|ipad|ios/i.test(userAgent)) {
      return 'ios';
    }
    if (/windows/i.test(userAgent)) {
      return 'windows';
    }
    if (/mac os/i.test(userAgent)) {
      return 'macos';
    }
    if (/linux/i.test(userAgent)) {
      return 'linux';
    }
    return 'unknown';
  }
}
