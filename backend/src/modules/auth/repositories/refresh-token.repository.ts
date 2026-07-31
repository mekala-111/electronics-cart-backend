import { Injectable } from '@nestjs/common';
import { RefreshToken, TokenStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const notDeleted = { deleted_at: null };

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        user_id: data.userId,
        token_hash: data.tokenHash,
        family_id: data.familyId,
        user_agent: data.userAgent,
        ip_address: data.ipAddress,
        expires_at: data.expiresAt,
        status: TokenStatus.active,
      },
    });
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: { token_hash: tokenHash, ...notDeleted },
    });
  }

  revoke(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        status: TokenStatus.revoked,
        revoked_at: new Date(),
      },
    });
  }

  rotate(id: string, replacedById: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        status: TokenStatus.rotated,
        replaced_by_id: replacedById,
        revoked_at: new Date(),
      },
    });
  }

  revokeFamily(familyId: string): Promise<number> {
    return this.prisma.refreshToken
      .updateMany({
        where: {
          family_id: familyId,
          status: TokenStatus.active,
          ...notDeleted,
        },
        data: {
          status: TokenStatus.revoked,
          revoked_at: new Date(),
        },
      })
      .then((r) => r.count);
  }

  revokeAllForUser(userId: string): Promise<number> {
    return this.prisma.refreshToken
      .updateMany({
        where: {
          user_id: userId,
          status: TokenStatus.active,
          ...notDeleted,
        },
        data: {
          status: TokenStatus.revoked,
          revoked_at: new Date(),
        },
      })
      .then((r) => r.count);
  }
}
