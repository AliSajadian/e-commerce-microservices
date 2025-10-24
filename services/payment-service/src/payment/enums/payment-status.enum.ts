export enum PaymentStatus {
  PAYMENT_STATUS_UNSPECIFIED = 'unspecified',
  PAYMENT_STATUS_PENDING = 'payment_pending',
  PAYMENT_STATUS_PROCESSING = 'payment_processing',
  PAYMENT_STATUS_COMPLETED = 'payment_completed',
  PAYMENT_STATUS_FAILED = 'payment_failed',
  PAYMENT_STATUS_CANCELLED = 'payment_cancelled',
  PAYMENT_STATUS_REFUNDED = 'payment_refunded',
  PAYMENT_STATUS_PARTIALLY_REFUNDED = 'payment_partially_refunded',
  PAYMENT_STATUS_EXPIRED = 'payment_expired',
  PAYMENT_STATUS_REQUIRES_ACTION = 'payment_requires_action', // For 3D Secure, etc.
}

/**
 * Map Stripe PaymentIntent status to our PaymentStatus enum
 */
export function mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
  switch (stripeStatus) {
    case 'payment_pending':
      return PaymentStatus.PAYMENT_STATUS_PENDING;
    case 'payment_processing':
      return PaymentStatus.PAYMENT_STATUS_PROCESSING;
    case 'payment_completed':
      return PaymentStatus.PAYMENT_STATUS_COMPLETED;
    case 'payment_failed':
      return PaymentStatus.PAYMENT_STATUS_FAILED;
    case 'payment_cancelled':
      return PaymentStatus.PAYMENT_STATUS_CANCELLED;
    case 'payment_refunded':
      return PaymentStatus.PAYMENT_STATUS_REFUNDED;
    case 'payment_partially_refunded':
      return PaymentStatus.PAYMENT_STATUS_PARTIALLY_REFUNDED;
    case 'payment_expired':
      return PaymentStatus.PAYMENT_STATUS_EXPIRED;
    case 'payment_requires_action':
      return PaymentStatus.PAYMENT_STATUS_REQUIRES_ACTION;
    default:
      // For any unknown status, map to unspecified
      return PaymentStatus.PAYMENT_STATUS_UNSPECIFIED;
  }
}

/**
 * Check if payment status indicates a successful payment
 */
export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === PaymentStatus.PAYMENT_STATUS_COMPLETED;
}

/**
 * Check if payment status indicates a failed payment
 */
export function isPaymentFailed(status: PaymentStatus): boolean {
  return [
    PaymentStatus.PAYMENT_STATUS_FAILED,
    PaymentStatus.PAYMENT_STATUS_CANCELLED,
  ].includes(status);
}

/**
 * Check if payment status indicates payment is still in progress
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return [
    PaymentStatus.PAYMENT_STATUS_PENDING,
    PaymentStatus.PAYMENT_STATUS_PROCESSING,
    PaymentStatus.PAYMENT_STATUS_REQUIRES_ACTION,
  ].includes(status);
}