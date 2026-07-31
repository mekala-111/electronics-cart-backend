import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OtpChannel,
  OtpPurpose,
  RecordStatus,
  User,
  UserType,
  AuthProvider,
} from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { AuthEventPublisher } from '../events/auth-event.publisher';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuditService } from './audit.service';
import { AuthMailService } from './auth-mail.service';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

const baseUser: User = {
  id: 'user-1',
  email: 'user@example.com',
  mobile: null,
  password_hash: 'hashed',
  email_verified_at: null,
  mobile_verified_at: null,
  user_type: UserType.customer,
  auth_provider: AuthProvider.local,
  last_login_at: null,
  last_login_ip: null,
  failed_login_count: 0,
  locked_until: null,
  mfa_enabled: false,
  mfa_secret: null,
  status: RecordStatus.pending,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
  created_by: null,
  updated_by: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let loginAttemptRepository: jest.Mocked<LoginAttemptRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findByMobile: jest.fn(),
            findByIdentifier: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            assignRole: jest.fn(),
            incrementFailedLogin: jest.fn(),
            resetFailedLogin: jest.fn(),
            lockUntil: jest.fn(),
          },
        },
        {
          provide: RoleRepository,
          useValue: {
            getUserRoleCodes: jest.fn().mockResolvedValue(['customer']),
            getUserPermissionCodes: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: LoginAttemptRepository,
          useValue: { create: jest.fn() },
        },
        {
          provide: RefreshTokenRepository,
          useValue: {
            findByHash: jest.fn(),
            create: jest.fn(),
            rotate: jest.fn(),
            revoke: jest.fn(),
            revokeFamily: jest.fn(),
            revokeAllForUser: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hash: jest.fn().mockResolvedValue('hashed-password'),
            verify: jest.fn(),
            isStrongPassword: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: TokenService,
          useValue: {
            createRefreshPair: jest.fn().mockResolvedValue({
              accessToken: 'access',
              refreshToken: 'refresh',
              expiresIn: 900,
            }),
            hashToken: jest.fn(),
            generateRawToken: jest.fn(),
            signAccessToken: jest.fn(),
            getAccessExpiresInSeconds: jest.fn().mockReturnValue(900),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn().mockResolvedValue({ session: { id: 'session-1' } }),
            listSessions: jest.fn(),
            revokeSession: jest.fn(),
            revokeAll: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            issueOtp: jest.fn().mockResolvedValue({ code: '123456', expiresAt: new Date(), otpId: 'otp-1' }),
            verifyOtp: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: AuthMailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            sendOtpEmail: jest.fn(),
          },
        },
        {
          provide: AuthEventPublisher,
          useValue: {
            userRegistered: jest.fn(),
            userLoggedIn: jest.fn(),
            userLoggedOut: jest.fn(),
            passwordChanged: jest.fn(),
            emailVerified: jest.fn(),
            tokenReuseDetected: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
    loginAttemptRepository = module.get(LoginAttemptRepository);
  });

  it('registers a new user with email', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(baseUser);
    userRepository.assignRole.mockResolvedValue(undefined);

    const result = await service.register(
      { email: 'user@example.com', password: 'SecurePass1!' },
      { ipAddress: '127.0.0.1' },
    );

    expect(result.accessToken).toBe('access');
    expect(result.user.email).toBe('user@example.com');
    expect(userRepository.assignRole).toHaveBeenCalled();
  });

  it('logs in successfully', async () => {
    userRepository.findByIdentifier.mockResolvedValue(baseUser);
    passwordService.verify.mockResolvedValue(true);
    userRepository.resetFailedLogin.mockResolvedValue(baseUser);
    userRepository.update.mockResolvedValue(baseUser);

    const result = await service.login(
      { identifier: 'user@example.com', password: 'SecurePass1!' },
      { ipAddress: '127.0.0.1' },
    );

    expect(result.accessToken).toBe('access');
    expect(loginAttemptRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('locks out after repeated failed logins', async () => {
    const lockedUser = {
      ...baseUser,
      failed_login_count: 4,
    };

    userRepository.findByIdentifier.mockResolvedValue(lockedUser);
    passwordService.verify.mockResolvedValue(false);
    userRepository.incrementFailedLogin.mockResolvedValue({
      ...lockedUser,
      failed_login_count: 5,
    });
    userRepository.lockUntil.mockResolvedValue({
      ...lockedUser,
      failed_login_count: 5,
      locked_until: new Date(Date.now() + 30 * 60 * 1000),
    });

    await expect(
      service.login(
        { identifier: 'user@example.com', password: 'wrong' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      }),
      status: HttpStatus.UNAUTHORIZED,
    });

    expect(userRepository.lockUntil).toHaveBeenCalled();
  });

  it('rejects login for locked accounts', async () => {
    userRepository.findByIdentifier.mockResolvedValue({
      ...baseUser,
      locked_until: new Date(Date.now() + 60_000),
    });

    await expect(
      service.login(
        { identifier: 'user@example.com', password: 'SecurePass1!' },
        { ipAddress: '127.0.0.1' },
      ),
    ).rejects.toBeInstanceOf(AppException);
  });
});
