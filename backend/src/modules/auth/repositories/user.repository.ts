import { Injectable } from '@nestjs/common';
import {
  AuthProvider,
  Prisma,
  RecordStatus,
  User,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const notDeleted = { deleted_at: null };

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, ...notDeleted },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), ...notDeleted },
    });
  }

  findByMobile(mobile: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { mobile, ...notDeleted },
    });
  }

  findByIdentifier(identifier: string): Promise<User | null> {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return this.findByEmail(trimmed);
    }
    return this.findByMobile(trimmed);
  }

  create(data: {
    email?: string | null;
    mobile?: string | null;
    passwordHash: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email?.toLowerCase() ?? null,
        mobile: data.mobile ?? null,
        password_hash: data.passwordHash,
        user_type: UserType.customer,
        auth_provider: AuthProvider.local,
        status: RecordStatus.pending,
      },
    });
  }

  createFromSocial(data: {
    email?: string | null;
    mobile?: string | null;
    authProvider: AuthProvider;
    emailVerified?: boolean;
    mobileVerified?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email?.toLowerCase() ?? null,
        mobile: data.mobile ?? null,
        password_hash: null,
        user_type: UserType.customer,
        auth_provider: data.authProvider,
        status: RecordStatus.active,
        email_verified_at: data.emailVerified ? new Date() : null,
        mobile_verified_at: data.mobileVerified ? new Date() : null,
      },
    });
  }

  findByOauth(provider: AuthProvider, providerUserId: string) {
    return this.prisma.oauthAccount.findFirst({
      where: {
        provider,
        provider_user_id: providerUserId,
        deleted_at: null,
      },
      include: { user: true },
    });
  }

  upsertOauth(data: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    email?: string | null;
  }) {
    // ponytail: DB unique is partial (deleted_at IS NULL) — Prisma upsert ON CONFLICT can't use it.
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.oauthAccount.findFirst({
        where: {
          provider: data.provider,
          provider_user_id: data.providerUserId,
          deleted_at: null,
        },
      });
      const email = data.email?.toLowerCase() ?? null;
      if (existing) {
        return tx.oauthAccount.update({
          where: { id: existing.id },
          data: {
            user_id: data.userId,
            email,
            status: RecordStatus.active,
            deleted_at: null,
          },
        });
      }
      return tx.oauthAccount.create({
        data: {
          user_id: data.userId,
          provider: data.provider,
          provider_user_id: data.providerUserId,
          email,
          status: RecordStatus.active,
        },
      });
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  incrementFailedLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { failed_login_count: { increment: 1 } },
    });
  }

  resetFailedLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { failed_login_count: 0, locked_until: null },
    });
  }

  lockUntil(id: string, until: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { locked_until: until },
    });
  }

  /**
   * Seed role IDs are UUID-shaped but not RFC v4 — Prisma Client rejects them on write.
   * Use SQL so FK to roles(id) still works.
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO user_roles (
        id, user_id, role_id, status, created_at, updated_at, deleted_at
      ) VALUES (
        gen_random_uuid(),
        ${userId}::uuid,
        ${roleId}::uuid,
        'active'::record_status,
        NOW(), NOW(), NULL
      )
      ON CONFLICT (user_id, role_id) DO UPDATE SET
        status = 'active'::record_status,
        deleted_at = NULL,
        updated_at = NOW()
    `;
  }
}
