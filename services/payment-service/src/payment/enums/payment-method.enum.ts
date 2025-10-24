export enum PaymentMethod {
  PAYMENT_METHOD_UNSPECIFIED = 'unspecified',
  PAYMENT_METHOD_CREDIT_CARD = 'credit_card',
  PAYMENT_METHOD_DEBIT_CARD = 'debit_card',
  PAYMENT_METHOD_PAYPAL = 'paypal',
  PAYMENT_METHOD_STRIPE = 'stripe',
  PAYMENT_METHOD_BANK_TRANSFER = 'transfer',
  PAYMENT_METHOD_WALLET = 'wallet',
  PAYMENT_METHOD_CRYPTO = 'crypto',
}

export function mapStripeMethodToPaymentMethod(stripeMethod: string): PaymentMethod {
  switch (stripeMethod) {
    case 'credit_card':
      return PaymentMethod.PAYMENT_METHOD_CREDIT_CARD;
    case 'debit_card':
      return PaymentMethod.PAYMENT_METHOD_DEBIT_CARD;
    case 'paypal':
      return PaymentMethod.PAYMENT_METHOD_PAYPAL;
    case 'stripe':
      return PaymentMethod.PAYMENT_METHOD_STRIPE;
    case 'transfer':
      return PaymentMethod.PAYMENT_METHOD_BANK_TRANSFER;
    case 'wallet':
      return PaymentMethod.PAYMENT_METHOD_WALLET;
    case 'crypto':
      return PaymentMethod.PAYMENT_METHOD_CRYPTO;
    default:
      // For any unknown Method, map to unspecified
      return PaymentMethod.PAYMENT_METHOD_UNSPECIFIED;
  }
}
