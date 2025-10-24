from __future__ import annotations
from datetime import datetime
import uuid # Enable postponed evaluation of type annotations
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.common.mixins import Timestamp
from .product import Product

class ProductReservation(Base, Timestamp):
    __tablename__ = "product_reservations"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True)
    reservation_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # From your proto
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # WHO reserved it
    reserved_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)  # Optional: user who made reservation
    reserved_by_service: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g., "order-service", "cart-service"
    
    # WHY reserved it
    reservation_reason: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "ORDER", "CART", "CHECKOUT"
    reference_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)  # order_id, cart_id, etc.
    
    # Reservation management
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True)  # ACTIVE, RELEASED, EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # Optional expiration
    
    # Relationships
    product: Mapped["Product"] = relationship("Product")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_reservation_product', 'reservation_id', 'product_id'),
        Index('idx_product_status', 'product_id', 'status'),
        Index('idx_reservation_status', 'reservation_id', 'status'),
    )
    
    def __repr__(self):
        return f"<ProductReservation(id={self.id}, reservation_id='{self.reservation_id}', product_id={self.product_id}, quantity={self.quantity}, status='{self.status}')>"
    
    
    