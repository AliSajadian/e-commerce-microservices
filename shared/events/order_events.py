from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

# Order Events
class OrderCreatedEvent(BaseModel):
    event_type: str = "order.created"
    order_id: uuid.UUID
    user_id: uuid.UUID
    total_amount: float
    currency: str
    items: List[Dict[str, Any]]
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class OrderUpdatedEvent(BaseModel):
    event_type: str = "order.updated"
    order_id: uuid.UUID
    user_id: uuid.UUID
    status: OrderStatus
    previous_status: OrderStatus
    updated_at: datetime
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class OrderCancelledEvent(BaseModel):
    event_type: str = "order.cancelled"
    order_id: uuid.UUID
    user_id: uuid.UUID
    reason: str
    cancelled_at: datetime
    refund_amount: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class OrderCompletedEvent(BaseModel):
    event_type: str = "order.completed"
    order_id: uuid.UUID
    user_id: uuid.UUID
    completed_at: datetime
    delivery_date: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

# Payment Events
class PaymentInitiatedEvent(BaseModel):
    event_type: str = "payment.initiated"
    payment_id: uuid.UUID
    order_id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    currency: str
    payment_method: str
    initiated_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class PaymentSucceededEvent(BaseModel):
    event_type: str = "payment.succeeded"
    payment_id: uuid.UUID
    order_id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    currency: str
    transaction_id: str
    succeeded_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class PaymentFailedEvent(BaseModel):
    event_type: str = "payment.failed"
    payment_id: uuid.UUID
    order_id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    currency: str
    failure_reason: str
    failed_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class PaymentRefundedEvent(BaseModel):
    event_type: str = "payment.refunded"
    payment_id: uuid.UUID
    order_id: uuid.UUID
    user_id: uuid.UUID
    refund_amount: float
    currency: str
    refund_reason: str
    refunded_at: datetime
    metadata: Optional[Dict[str, Any]] = None

# User Events
class UserRegisteredEvent(BaseModel):
    event_type: str = "user.registered"
    user_id: uuid.UUID
    username: str
    email: str
    first_name: str
    last_name: str
    registered_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class UserPasswordResetEvent(BaseModel):
    event_type: str = "user.password_reset"
    user_id: uuid.UUID
    email: str
    reset_at: datetime
    metadata: Optional[Dict[str, Any]] = None

# Product Events
class ProductInventoryUpdatedEvent(BaseModel):
    event_type: str = "product.inventory_updated"
    product_id: uuid.UUID
    previous_quantity: int
    new_quantity: int
    updated_at: datetime
    reason: str
    metadata: Optional[Dict[str, Any]] = None

class ProductReservedEvent(BaseModel):
    event_type: str = "product.reserved"
    product_id: uuid.UUID
    order_id: uuid.UUID
    quantity: int
    reserved_at: datetime
    expires_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class ProductReservationReleasedEvent(BaseModel):
    event_type: str = "product.reservation_released"
    product_id: uuid.UUID
    order_id: uuid.UUID
    quantity: int
    released_at: datetime
    reason: str
    metadata: Optional[Dict[str, Any]] = None

# Notification Events
class NotificationSentEvent(BaseModel):
    event_type: str = "notification.sent"
    notification_id: uuid.UUID
    user_id: uuid.UUID
    channel: str  # email, push, sms, in_app
    status: str  # sent, failed, pending
    sent_at: datetime
    metadata: Optional[Dict[str, Any]] = None

# Review Events
class ReviewCreatedEvent(BaseModel):
    event_type: str = "review.created"
    review_id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class ReviewModeratedEvent(BaseModel):
    event_type: str = "review.moderated"
    review_id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    status: str  # approved, rejected
    moderated_by: uuid.UUID
    moderated_at: datetime
    metadata: Optional[Dict[str, Any]] = None

# Recommendation Events
class RecommendationGeneratedEvent(BaseModel):
    event_type: str = "recommendation.generated"
    user_id: uuid.UUID
    recommendation_type: str
    product_count: int
    generated_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class RecommendationClickedEvent(BaseModel):
    event_type: str = "recommendation.clicked"
    user_id: uuid.UUID
    product_id: uuid.UUID
    recommendation_id: uuid.UUID
    clicked_at: datetime
    metadata: Optional[Dict[str, Any]] = None

