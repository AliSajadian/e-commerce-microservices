export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  // Add more as needed
}

export function mapStripeMethodToPaymentMethod(stripeMethod: string): PaymentMethod {
  switch (stripeMethod) {
    case 'credit_card':
      return PaymentMethod.CREDIT_CARD;
    case 'paypal':
      return PaymentMethod.PAYPAL;
    default:
      // For any unknown Method, map to pending
      return PaymentMethod.BANK_TRANSFER;
  }
}
