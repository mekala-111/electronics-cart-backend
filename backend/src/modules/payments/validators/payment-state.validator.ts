import { PaymentStatus } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { PAYMENT_STATUS } from '../constants/payments.constants';

const ALLOWED: Record<string, string[]> = {
  [PAYMENT_STATUS.PENDING]: [
    PAYMENT_STATUS.AUTHORIZED,
    PAYMENT_STATUS.CAPTURED,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.EXPIRED,
  ],
  [PAYMENT_STATUS.AUTHORIZED]: [
    PAYMENT_STATUS.CAPTURED,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.FAILED,
  ],
  [PAYMENT_STATUS.CAPTURED]: [
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.CHARGEBACK,
  ],
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.CHARGEBACK,
  ],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.CANCELLED]: [],
  [PAYMENT_STATUS.EXPIRED]: [],
  [PAYMENT_STATUS.REFUNDED]: [PAYMENT_STATUS.CHARGEBACK],
  [PAYMENT_STATUS.CHARGEBACK]: [],
};

export function assertTransition(from: PaymentStatus, to: string): void {
  const allowed = ALLOWED[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppException(
      ErrorCodes.CONFLICT,
      `Invalid payment transition ${from} → ${to}`,
      409,
    );
  }
}
