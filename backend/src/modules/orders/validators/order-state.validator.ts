import { OrderStatus } from '@prisma/client';
import { ALLOWED_CANCEL_FROM, ALLOWED_RETURN_FROM } from '../constants/orders.constants';

export function canCancel(status: OrderStatus): boolean {
  return ALLOWED_CANCEL_FROM.has(status);
}

export function canRequestReturn(status: OrderStatus): boolean {
  return ALLOWED_RETURN_FROM.has(status);
}

export function nextOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rnd}`;
}

export function nextReturnNumber(): string {
  return `RET-${Date.now().toString(36).toUpperCase()}`;
}

export function nextExchangeNumber(): string {
  return `EXC-${Date.now().toString(36).toUpperCase()}`;
}

export function nextFulfillmentNumber(): string {
  return `FUL-${Date.now().toString(36).toUpperCase()}`;
}
