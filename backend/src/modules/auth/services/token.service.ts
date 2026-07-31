import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { JwtPayload } from '../../../common/types/auth-user.type';
import { hashToken, randomToken } from '../../../common/utils/crypto.util';
import { addDays } from '../../../common/utils/date.util';
import { REFRESH_DAYS } from '../constants/auth.constants';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RoleRepository } from '../repositories/role.repository';
import { RequestMeta } from '../utils/request-meta.util';

export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId?: string;
  tokenFamilyId: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  hashToken(raw: string): string {
    return hashToken(raw);
  }

  generateRawToken(): string {
    return randomToken(32);
  }

  async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  getAccessExpiresInSeconds(): number {
    const raw = this.config.getOrThrow<string>('jwt.accessExpiresIn');
    return this.parseDurationToSeconds(raw);
  }

  async createRefreshPair(
    user: User,
    meta: RequestMeta & { sessionId?: string; familyId?: string },
  ): Promise<TokenPairResult> {
    const familyId = meta.familyId ?? randomUUID();
    const rawRefresh = this.generateRawToken();
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = addDays(new Date(), REFRESH_DAYS);

    const [roles, permissions] = await Promise.all([
      this.roleRepository.getUserRoleCodes(user.id),
      this.roleRepository.getUserPermissionCodes(user.id),
    ]);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      familyId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      email: user.email ?? undefined,
      mobile: user.mobile ?? undefined,
      roles,
      permissions,
      sessionId: meta.sessionId,
      tokenFamilyId: familyId,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.getAccessExpiresInSeconds(),
      sessionId: meta.sessionId,
      tokenFamilyId: familyId,
    };
  }

  private parseDurationToSeconds(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return 900;
    }

    const amount = Number(match[1]);
    switch (match[2]) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 3600;
      case 'd':
        return amount * 86400;
      default:
        return 900;
    }
  }
}
