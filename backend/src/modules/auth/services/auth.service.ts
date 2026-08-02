import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AuthProvider,
  OtpChannel,
  OtpPurpose,
  RecordStatus,
  TokenStatus,
  User,
} from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { addDays, addMinutes } from '../../../common/utils/date.util';
import {
  CUSTOMER_ROLE_ID,
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGINS,
  REFRESH_DAYS,
} from '../constants/auth.constants';
import {
  EmailVerifiedEvent,
  PasswordChangedEvent,
  TokenReuseDetectedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../events/auth.events';
import { AuthEventPublisher } from '../events/auth-event.publisher';
import { toPublicUser, PublicUser } from '../mappers/user.mapper';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuditService } from './audit.service';
import { AuthMailService } from './auth-mail.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { RequestMeta } from '../utils/request-meta.util';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokensResponse {
  user: PublicUser;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly loginAttemptRepository: LoginAttemptRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
    private readonly authMailService: AuthMailService,
    private readonly authEventPublisher: AuthEventPublisher,
    private readonly firebaseAuth: FirebaseAuthService,
  ) {}

  async register(
    input: { email?: string; mobile?: string; password: string },
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    if (!input.email && !input.mobile) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'Email or mobile is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.passwordService.isStrongPassword(input.password)) {
      throw new AppException(
        ErrorCodes.AUTH_WEAK_PASSWORD,
        'Password does not meet policy requirements',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (input.email) {
      const existing = await this.userRepository.findByEmail(input.email);
      if (existing) {
        throw new AppException(
          ErrorCodes.AUTH_EMAIL_TAKEN,
          'Email is already registered',
          HttpStatus.CONFLICT,
        );
      }
    }

    if (input.mobile) {
      const existing = await this.userRepository.findByMobile(input.mobile);
      if (existing) {
        throw new AppException(
          ErrorCodes.AUTH_MOBILE_TAKEN,
          'Mobile number is already registered',
          HttpStatus.CONFLICT,
        );
      }
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      mobile: input.mobile,
      passwordHash,
    });

    await this.userRepository.assignRole(user.id, CUSTOMER_ROLE_ID);

    await this.auditService.log('REGISTER', {
      entityId: user.id,
      performedBy: user.id,
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
      requestId: meta.requestId,
      newValues: { email: user.email, mobile: user.mobile },
    });

    this.authEventPublisher.userRegistered(
      new UserRegisteredEvent({
        userId: user.id,
        email: user.email,
        mobile: user.mobile,
      }),
    );

    if (user.email) {
      try {
        const { code } = await this.otpService.issueOtp(
          user.email,
          OtpChannel.email,
          OtpPurpose.verify_email,
          user.id,
        );
        await this.authMailService.sendVerificationEmail(user.email, code);
      } catch {
        // OTP/mail must not block account creation + login tokens.
      }
    }

    return this.createAuthResponse(user, meta).then(({ sessionId: _s, ...rest }) => rest);
  }

  async login(
    input: { identifier: string; password: string },
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    const user = await this.userRepository.findByIdentifier(input.identifier);

    if (!user) {
      await this.loginAttemptRepository.create({
        identifier: input.identifier,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        success: false,
        failureReason: 'user_not_found',
      });
      throw new AppException(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.assertAccountAccessible(user);

    const passwordValid = user.password_hash
      ? await this.passwordService.verify(user.password_hash, input.password)
      : false;

    if (!passwordValid) {
      await this.handleFailedLogin(user, input.identifier, meta, 'invalid_password');
      throw new AppException(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.userRepository.resetFailedLogin(user.id);
    await this.userRepository.update(user.id, {
      last_login_at: new Date(),
      last_login_ip: meta.ipAddress,
    });

    // Backfill customer role for accounts created before assignRole SQL fix
    const roles = await this.roleRepository.getUserRoleCodes(user.id);
    if (!roles.length) {
      await this.userRepository.assignRole(user.id, CUSTOMER_ROLE_ID);
    }

    await this.loginAttemptRepository.create({
      userId: user.id,
      identifier: input.identifier,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      success: true,
    });

    const response = await this.issueAuthResponse(user, meta);

    await this.auditService.log('LOGIN', {
      entityId: user.id,
      performedBy: user.id,
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
      requestId: meta.requestId,
    });

    return response;
  }

  /**
   * Exchange a verified Firebase ID token for Nest JWTs.
   * Used after Google / phone OTP on the storefront.
   */
  async loginWithFirebase(
    idToken: string,
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    try {
      return await this.loginWithFirebaseInner(idToken, meta);
    } catch (err) {
      if (err instanceof AppException) throw err;
      this.logger.error(
        `loginWithFirebase failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new AppException(
        ErrorCodes.INTERNAL_ERROR,
        err instanceof Error ? err.message : 'Firebase login failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async loginWithFirebaseInner(
    idToken: string,
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    const identity = await this.firebaseAuth.verifyIdToken(idToken);
    const provider = this.mapFirebaseProvider(identity.signInProvider);

    if (!identity.email && !identity.phone) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'Firebase account must have an email or phone number',
        HttpStatus.BAD_REQUEST,
      );
    }

    let user: User | null = null;
    const oauth = await this.userRepository.findByOauth(provider, identity.uid);
    if (oauth?.user && !oauth.user.deleted_at) {
      user = oauth.user;
    }

    if (!user && identity.email) {
      user = await this.userRepository.findByEmail(identity.email);
    }
    if (!user && identity.phone) {
      user = await this.userRepository.findByMobile(identity.phone);
    }

    if (!user) {
      let created = false;
      try {
        user = await this.userRepository.createFromSocial({
          email: identity.email,
          mobile: identity.phone,
          authProvider: provider,
          emailVerified: identity.emailVerified,
          mobileVerified: Boolean(identity.phone),
        });
        created = true;
      } catch {
        // Race / prior partial signup: email already exists
        if (identity.email) {
          user = await this.userRepository.findByEmail(identity.email);
        }
        if (!user && identity.phone) {
          user = await this.userRepository.findByMobile(identity.phone);
        }
        if (!user) {
          throw new AppException(
            ErrorCodes.INTERNAL_ERROR,
            'Could not create or link Firebase user',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
      if (created) {
        await this.userRepository.assignRole(user.id, CUSTOMER_ROLE_ID);
        this.authEventPublisher.userRegistered(
          new UserRegisteredEvent({
            userId: user.id,
            email: user.email,
            mobile: user.mobile,
          }),
        );
      }
    } else {
      await this.assertAccountAccessible(user);
      const patch: Record<string, unknown> = {
        last_login_at: new Date(),
        last_login_ip: meta.ipAddress,
      };
      if (identity.emailVerified && !user.email_verified_at) {
        patch.email_verified_at = new Date();
      }
      if (identity.phone && !user.mobile_verified_at) {
        patch.mobile_verified_at = new Date();
      }
      if (user.status === RecordStatus.pending) {
        patch.status = RecordStatus.active;
      }
      user = await this.userRepository.update(user.id, patch);
    }

    // oauth_accounts CHECK only allows google|apple (not otp)
    if (
      provider === AuthProvider.google ||
      provider === AuthProvider.apple
    ) {
      await this.userRepository.upsertOauth({
        userId: user.id,
        provider,
        providerUserId: identity.uid,
        email: identity.email,
      });
    }
    await this.userRepository.resetFailedLogin(user.id);
    await this.loginAttemptRepository.create({
      userId: user.id,
      identifier: identity.email ?? identity.phone ?? identity.uid,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      success: true,
    });

    const response = await this.issueAuthResponse(user, meta);

    await this.auditService.log('LOGIN_FIREBASE', {
      entityId: user.id,
      performedBy: user.id,
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
      requestId: meta.requestId,
      newValues: { provider: identity.signInProvider },
    });

    return response;
  }

  private mapFirebaseProvider(signInProvider: string): AuthProvider {
    if (signInProvider === 'phone') return AuthProvider.otp;
    if (signInProvider === 'google.com') return AuthProvider.google;
    if (signInProvider === 'apple.com') return AuthProvider.apple;
    return AuthProvider.google;
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored) {
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (
      stored.status === TokenStatus.rotated ||
      stored.status === TokenStatus.revoked
    ) {
      await this.refreshTokenRepository.revokeFamily(stored.family_id);
      this.authEventPublisher.tokenReuseDetected(
        new TokenReuseDetectedEvent({
          userId: stored.user_id,
          familyId: stored.family_id,
        }),
      );
      throw new AppException(
        ErrorCodes.AUTH_TOKEN_REUSED,
        'Refresh token reuse detected',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (
      stored.status !== TokenStatus.active ||
      stored.expires_at.getTime() <= Date.now()
    ) {
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Refresh token expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findById(stored.user_id);
    if (!user) {
      throw new AppException(
        ErrorCodes.AUTH_INVALID_TOKEN,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.assertAccountAccessible(user);

    const rawRefresh = this.tokenService.generateRawToken();
    const newHash = this.tokenService.hashToken(rawRefresh);
    const expiresAt = addDays(new Date(), REFRESH_DAYS);

    const newToken = await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newHash,
      familyId: stored.family_id,
      userAgent: stored.user_agent ?? undefined,
      ipAddress: stored.ip_address ?? undefined,
      expiresAt,
    });

    await this.refreshTokenRepository.rotate(stored.id, newToken.id);

    const [roles, permissions] = await Promise.all([
      this.roleRepository.getUserRoleCodes(user.id),
      this.roleRepository.getUserPermissionCodes(user.id),
    ]);

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email ?? undefined,
      mobile: user.mobile ?? undefined,
      roles,
      permissions,
      tokenFamilyId: stored.family_id,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.tokenService.getAccessExpiresInSeconds(),
    };
  }

  async logout(
    userId: string,
    refreshToken?: string,
    sessionId?: string,
  ): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.tokenService.hashToken(refreshToken);
      const stored = await this.refreshTokenRepository.findByHash(tokenHash);
      if (stored && stored.user_id === userId) {
        await this.refreshTokenRepository.revoke(stored.id);
      }
    }

    if (sessionId) {
      await this.sessionService.revokeSession(userId, sessionId);
    }

    await this.auditService.log('LOGOUT', {
      entityId: userId,
      performedBy: userId,
    });

    this.authEventPublisher.userLoggedOut(
      new UserLoggedOutEvent({ userId, sessionId }),
    );
  }

  async me(userId: string, sessionId?: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const [roles, permissions] = await Promise.all([
      this.roleRepository.getUserRoleCodes(userId),
      this.roleRepository.getUserPermissionCodes(userId),
    ]);

    return {
      user: toPublicUser(user),
      roles,
      permissions,
      sessionId,
    };
  }

  async updateProfile(userId: string, input: { mobile?: string }) {
    if (input.mobile) {
      const existing = await this.userRepository.findByMobile(input.mobile);
      if (existing && existing.id !== userId) {
        throw new AppException(
          ErrorCodes.AUTH_MOBILE_TAKEN,
          'Mobile number is already registered',
          HttpStatus.CONFLICT,
        );
      }
    }

    const user = await this.userRepository.update(userId, {
      ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
    });

    await this.auditService.log('UPDATE_PROFILE', {
      entityId: userId,
      performedBy: userId,
      newValues: { mobile: user.mobile },
    });

    return toPublicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    keepSessionId?: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.password_hash) {
      throw new AppException(
        ErrorCodes.AUTH_CURRENT_PASSWORD_INVALID,
        'Current password is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    const valid = await this.passwordService.verify(
      user.password_hash,
      currentPassword,
    );
    if (!valid) {
      throw new AppException(
        ErrorCodes.AUTH_CURRENT_PASSWORD_INVALID,
        'Current password is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.passwordService.isStrongPassword(newPassword)) {
      throw new AppException(
        ErrorCodes.AUTH_WEAK_PASSWORD,
        'Password does not meet policy requirements',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.update(userId, { password_hash: passwordHash });
    await this.refreshTokenRepository.revokeAllForUser(userId);
    await this.sessionService.revokeAll(userId, keepSessionId);

    await this.auditService.log('CHANGE_PASSWORD', {
      entityId: userId,
      performedBy: userId,
    });

    this.authEventPublisher.passwordChanged(
      new PasswordChangedEvent({ userId }),
    );
  }

  async forgotPassword(identifier: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdentifier(identifier);

    if (user?.email) {
      const { code } = await this.otpService.issueOtp(
        user.email,
        OtpChannel.email,
        OtpPurpose.reset_password,
        user.id,
      );
      await this.authMailService.sendPasswordResetEmail(user.email, code);
    }

    return {
      message:
        'If an account exists for that identifier, password reset instructions have been sent.',
    };
  }

  async resetPassword(input: {
    destination: string;
    code: string;
    newPassword: string;
  }): Promise<void> {
    if (!this.passwordService.isStrongPassword(input.newPassword)) {
      throw new AppException(
        ErrorCodes.AUTH_WEAK_PASSWORD,
        'Password does not meet policy requirements',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.otpService.verifyOtp(
      input.destination,
      OtpPurpose.reset_password,
      input.code,
    );

    const user = await this.userRepository.findByIdentifier(input.destination);
    if (!user) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const passwordHash = await this.passwordService.hash(input.newPassword);
    await this.userRepository.update(user.id, { password_hash: passwordHash });
    await this.refreshTokenRepository.revokeAllForUser(user.id);
    await this.sessionService.revokeAll(user.id);

    await this.auditService.log('RESET_PASSWORD', {
      entityId: user.id,
      performedBy: user.id,
    });
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.email_verified_at) {
      throw new AppException(
        ErrorCodes.AUTH_EMAIL_ALREADY_VERIFIED,
        'Email is already verified',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.otpService.verifyOtp(email, OtpPurpose.verify_email, code);

    await this.userRepository.update(user.id, {
      email_verified_at: new Date(),
      status: RecordStatus.active,
    });

    await this.auditService.log('VERIFY_EMAIL', {
      entityId: user.id,
      performedBy: user.id,
    });

    this.authEventPublisher.emailVerified(
      new EmailVerifiedEvent({ userId: user.id, email }),
    );
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);

    if (user?.email && !user.email_verified_at) {
      const { code } = await this.otpService.issueOtp(
        user.email,
        OtpChannel.email,
        OtpPurpose.verify_email,
        user.id,
      );
      await this.authMailService.sendVerificationEmail(user.email, code);
    }

    return {
      message:
        'If an unverified account exists for that email, a verification code has been sent.',
    };
  }

  async sendOtp(input: {
    destination: string;
    channel: OtpChannel;
    purpose: OtpPurpose;
    userId?: string;
  }): Promise<{ message: string }> {
    const { code } = await this.otpService.issueOtp(
      input.destination,
      input.channel,
      input.purpose,
      input.userId,
    );

    if (input.channel === OtpChannel.email) {
      await this.authMailService.sendOtpEmail(
        input.destination,
        code,
        input.purpose,
      );
    }

    return { message: 'OTP sent if destination is valid.' };
  }

  async verifyOtp(input: {
    destination: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<{ verified: boolean }> {
    await this.otpService.verifyOtp(
      input.destination,
      input.purpose,
      input.code,
    );
    return { verified: true };
  }

  listSessions(userId: string, currentSessionId?: string) {
    return this.sessionService.listSessions(userId, currentSessionId);
  }

  revokeSession(userId: string, sessionId: string): Promise<void> {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    return this.sessionService.revokeAll(userId, exceptSessionId);
  }

  private async createAuthResponse(
    user: User,
    meta: RequestMeta,
  ): Promise<LoginResponse & { sessionId: string }> {
    const { session } = await this.sessionService.createSession(user.id, meta);

    const tokens = await this.tokenService.createRefreshPair(user, {
      ...meta,
      sessionId: session.id,
    });

    const [roles, permissions] = await Promise.all([
      this.roleRepository.getUserRoleCodes(user.id),
      this.roleRepository.getUserPermissionCodes(user.id),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: toPublicUser(user),
      roles,
      permissions,
      sessionId: session.id,
    };
  }

  private async issueAuthResponse(
    user: User,
    meta: RequestMeta,
  ): Promise<LoginResponse> {
    const response = await this.createAuthResponse(user, meta);

    this.authEventPublisher.userLoggedIn(
      new UserLoggedInEvent({
        userId: user.id,
        sessionId: response.sessionId,
        ipAddress: meta.ipAddress,
      }),
    );

    const { sessionId: _sessionId, ...loginResponse } = response;
    return loginResponse;
  }

  private async assertAccountAccessible(user: User): Promise<void> {
    if (user.locked_until && user.locked_until.getTime() > Date.now()) {
      throw new AppException(
        ErrorCodes.AUTH_ACCOUNT_LOCKED,
        'Account is temporarily locked',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      user.status === RecordStatus.inactive ||
      user.status === RecordStatus.suspended ||
      user.status === RecordStatus.archived
    ) {
      throw new AppException(
        ErrorCodes.AUTH_ACCOUNT_INACTIVE,
        'Account is inactive',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async handleFailedLogin(
    user: User,
    identifier: string,
    meta: RequestMeta,
    reason: string,
  ): Promise<void> {
    await this.loginAttemptRepository.create({
      userId: user.id,
      identifier,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      success: false,
      failureReason: reason,
    });

    const updated = await this.userRepository.incrementFailedLogin(user.id);

    if (updated.failed_login_count >= MAX_FAILED_LOGINS) {
      await this.userRepository.lockUntil(
        user.id,
        addMinutes(new Date(), LOCKOUT_MINUTES),
      );
    }
  }
}
