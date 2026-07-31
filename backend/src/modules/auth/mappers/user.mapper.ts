import { User } from '@prisma/client';

export interface PublicUser {
  id: string;
  email: string | null;
  mobile: string | null;
  emailVerifiedAt: Date | null;
  mobileVerifiedAt: Date | null;
  userType: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    mobile: user.mobile,
    emailVerifiedAt: user.email_verified_at,
    mobileVerifiedAt: user.mobile_verified_at,
    userType: user.user_type,
    status: user.status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}
