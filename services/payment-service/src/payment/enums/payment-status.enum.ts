export enum PaymentStatus {
  // Stripe PaymentIntent statuses
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELED = 'canceled',
  SUCCEEDED = 'succeeded',
  
  // Custom statuses for our application
  CREATED = 'created',
  PENDING = 'pending',
  PAYMENT_FAILED = 'payment_failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

/**
 * Map Stripe PaymentIntent status to our PaymentStatus enum
 */
export function mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
  switch (stripeStatus) {
    case 'requires_payment_method':
      return PaymentStatus.REQUIRES_PAYMENT_METHOD;
    case 'requires_confirmation':
      return PaymentStatus.REQUIRES_CONFIRMATION;
    case 'requires_action':
      return PaymentStatus.REQUIRES_ACTION;
    case 'processing':
      return PaymentStatus.PROCESSING;
    case 'requires_capture':
      return PaymentStatus.REQUIRES_CAPTURE;
    case 'canceled':
      return PaymentStatus.CANCELED;
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    default:
      // For any unknown status, map to pending
      return PaymentStatus.PENDING;
  }
}

/**
 * Check if payment status indicates a successful payment
 */
export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === PaymentStatus.SUCCEEDED;
}

/**
 * Check if payment status indicates a failed payment
 */
export function isPaymentFailed(status: PaymentStatus): boolean {
  return [
    PaymentStatus.PAYMENT_FAILED,
    PaymentStatus.CANCELED,
  ].includes(status);
}

/**
 * Check if payment status indicates payment is still in progress
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return [
    PaymentStatus.CREATED,
    PaymentStatus.PENDING,
    PaymentStatus.REQUIRES_PAYMENT_METHOD,
    PaymentStatus.REQUIRES_CONFIRMATION,
    PaymentStatus.REQUIRES_ACTION,
    PaymentStatus.PROCESSING,
    PaymentStatus.REQUIRES_CAPTURE,
  ].includes(status);
}