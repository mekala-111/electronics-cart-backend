export interface AuthUser {
  sub: string;
  email?: string;
  mobile?: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  tokenFamilyId?: string;
}

export interface JwtPayload extends AuthUser {
  iat?: number;
  exp?: number;
}
