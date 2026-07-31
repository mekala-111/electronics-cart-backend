import { HttpStatus, Injectable } from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { sha256 } from '../../../common/utils/crypto.util';
import { addMinutes } from '../../../common/utils/date.util';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { OTP_TTL_MINUTES } from '../constants/auth.constants';
import { OtpRepository } from '../repositories/otp.repository';

export interface IssueOtpResult {
  code: string;
  expiresAt: Date;
  otpId: string;
}

@Injectable()
export class OtpService {
  constructor(private readonly otpRepository: OtpRepository) {}

  async issueOtp(
    destination: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    userId?: string,
  ): Promise<IssueOtpResult> {
    const code = this.generateCode();
    const expiresAt = addMinutes(new Date(), OTP_TTL_MINUTES);

    const otp = await this.otpRepository.create({
      userId,
      destination: this.normalizeDestination(destination, channel),
      channel,
      purpose,
      codeHash: sha256(code),
      expiresAt,
    });

    return { code, expiresAt, otpId: otp.id };
  }

  async verifyOtp(
    destination: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<{ userId?: string | null; otpId: string }> {
    const normalized = destination.includes('@')
      ? destination.toLowerCase()
      : destination.trim();

    const otp = await this.otpRepository.findLatestActive(normalized, purpose);

    if (!otp) {
      throw new AppException(
        ErrorCodes.AUTH_OTP_EXPIRED,
        'OTP expired or not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (otp.attempts >= otp.max_attempts) {
      throw new AppException(
        ErrorCodes.AUTH_OTP_MAX_ATTEMPTS,
        'Maximum OTP attempts exceeded',
        HttpStatus.BAD_REQUEST,
      );
    }

    const valid = sha256(code) === otp.code_hash;

    if (!valid) {
      await this.otpRepository.incrementAttempts(otp.id);
      throw new AppException(
        ErrorCodes.AUTH_OTP_INVALID,
        'Invalid OTP code',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.otpRepository.consume(otp.id);
    return { userId: otp.user_id, otpId: otp.id };
  }

  private generateCode(): string {
    return String(randomInt(100000, 999999));
  }

  private normalizeDestination(destination: string, channel: OtpChannel): string {
    if (channel === OtpChannel.email) {
      return destination.toLowerCase().trim();
    }
    return destination.trim();
  }
}
