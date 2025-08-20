from enum import Enum


class OrderStatus(Enum):
    """Order lifecycle statuses."""
    
    # Initial states
    DRAFT = "draft"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    
    # Payment states
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_FAILED = "payment_failed"
    PAID = "paid"
    
    # Processing states
    PROCESSING = "processing"
    PICKED = "picked"
    PACKED = "packed"
    
    # Fulfillment states
    SHIPPED = "shipped"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    
    # Exception states
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    RETURNED = "returned"
    EXCHANGE_REQUESTED = "exchange_requested"
    
    # Hold states
    ON_HOLD = "on_hold"
    BACKORDERED = "backordered"
    
    @property
    def is_final_state(self) -> bool:
        """Check if this status represents a final state."""
        return self in {
            self.DELIVERED,
            self.CANCELLED,
            self.REFUNDED,
            self.RETURNED
        }
    
    @property
    def can_be_cancelled(self) -> bool:
        """Check if order can be cancelled from this status."""
        return self in {
            self.DRAFT,
            self.PENDING,
            self.CONFIRMED,
            self.PAYMENT_PENDING,
            self.ON_HOLD
        }
