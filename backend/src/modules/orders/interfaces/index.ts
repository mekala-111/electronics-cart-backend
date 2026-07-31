export interface CheckoutAddressInput {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  gstin?: string;
}

export interface CheckoutContext {
  userId: string;
  cartId: string;
  warehouseId: string;
  orderId?: string;
  orderNumber?: string;
  reservationIds?: string[];
  paymentId?: string;
  amount?: number;
  shipping?: CheckoutAddressInput;
  billing?: CheckoutAddressInput;
  giftCardCode?: string;
  walletAmount?: number;
  [key: string]: unknown;
}
