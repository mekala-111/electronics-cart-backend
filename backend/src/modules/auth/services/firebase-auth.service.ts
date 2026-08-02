import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export type VerifiedFirebaseIdentity = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  /** google.com | phone | password | … */
  signInProvider: string;
};

@Injectable()
export class FirebaseAuthService {
  constructor(private readonly config: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseIdentity> {
    const projectId =
      this.config.get<string>('app.firebaseProjectId')?.trim() ||
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      '';

    if (!projectId) {
      throw new AppException(
        ErrorCodes.INTERNAL_ERROR,
        'FIREBASE_PROJECT_ID is not configured',
        503,
      );
    }

    try {
      const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });

      const uid = String(payload.sub ?? '');
      if (!uid) {
        throw new Error('missing sub');
      }

      const firebase = payload.firebase as
        | { sign_in_provider?: string }
        | undefined;

      return {
        uid,
        email: typeof payload.email === 'string' ? payload.email : null,
        emailVerified: payload.email_verified === true,
        phone:
          typeof payload.phone_number === 'string'
            ? payload.phone_number
            : null,
        signInProvider: firebase?.sign_in_provider ?? 'unknown',
      };
    } catch (err) {
      if (err instanceof AppException) throw err;
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid Firebase ID token',
        401,
      );
    }
  }
}
