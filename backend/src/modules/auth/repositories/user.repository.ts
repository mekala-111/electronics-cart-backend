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
    return this.prisma.oauthAccount.upsert({
      where: {
        provider_provider_user_id: {
          provider: data.provider,
          provider_user_id: data.providerUserId,
        },
      },
      create: {
        user_id: data.userId,
        provider: data.provider,
        provider_user_id: data.providerUserId,
        email: data.email?.toLowerCase() ?? null,
        status: RecordStatus.active,
      },
      update: {
        user_id: data.userId,
        email: data.email?.toLowerCase() ?? null,
        status: RecordStatus.active,
        deleted_at: null,
      },
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

  assignRole(userId: string, roleId: string): Promise<void> {
    return this.prisma.userRole
      .upsert({
        where: {
          user_id_role_id: { user_id: userId, role_id: roleId },
        },
        create: {
          user_id: userId,
          role_id: roleId,
          status: RecordStatus.active,
        },
        update: { status: RecordStatus.active, deleted_at: null },
      })
      .then(() => undefined);
  }
}
