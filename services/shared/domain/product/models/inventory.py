from dataclasses import dataclass
from datetime import datetime
import uuid

from . import BaseEntity

# ============================================================================
# INVENTORY MODEL
# ============================================================================

@dataclass
class Inventory(BaseEntity):
    """
    Inventory domain model - stock management
    """
    product_id: uuid.UUID
    quantity: int
    reserved_quantity: int = 0
    low_stock_threshold: int = 10
    
    # Business methods
    def get_available_quantity(self) -> int:
        """Get quantity available for sale"""
        return max(0, self.quantity - self.reserved_quantity)
    
    def is_in_stock(self) -> bool:
        """Check if product is in stock"""
        return self.get_available_quantity() > 0
    
    def is_low_stock(self) -> bool:
        """Check if stock is below threshold"""
        return self.get_available_quantity() <= self.low_stock_threshold
    
    def can_reserve(self, quantity: int) -> bool:
        """Check if quantity can be reserved"""
        return self.get_available_quantity() >= quantity
    
    def reserve_stock(self, quantity: int) -> None:
        """Reserve stock for an order"""
        if not self.can_reserve(quantity):
            raise ValueError(f"Cannot reserve {quantity} items. Available: {self.get_available_quantity()}")
        
        self.reserved_quantity += quantity
        self.updated_at = datetime.utcnow()
    
    def release_reserved_stock(self, quantity: int) -> None:
        """Release reserved stock"""
        if quantity > self.reserved_quantity:
            raise ValueError(f"Cannot release {quantity} items. Reserved: {self.reserved_quantity}")
        
        self.reserved_quantity -= quantity
        self.updated_at = datetime.utcnow()
    
    def adjust_quantity(self, adjustment: int) -> None:
        """Adjust inventory quantity (positive or negative)"""
        new_quantity = self.quantity + adjustment
        if new_quantity < 0:
            raise ValueError(f"Adjustment would result in negative quantity: {new_quantity}")
        
        self.quantity = new_quantity
        self.updated_at = datetime.utcnow()
    
    def fulfill_reservation(self, quantity: int) -> None:
        """Fulfill order by reducing both reserved and actual quantity"""
        if quantity > self.reserved_quantity:
            raise ValueError(f"Cannot fulfill {quantity} items. Reserved: {self.reserved_quantity}")
        
        self.reserved_quantity -= quantity
        self.quantity -= quantity
        self.updated_at = datetime.utcnow()
    
    def validate(self) -> None:
        """Validate inventory business rules"""
        if self.quantity < 0:
            raise ValueError("Inventory quantity cannot be negative")
        if self.reserved_quantity < 0:
            raise ValueError("Reserved quantity cannot be negative")
        if self.reserved_quantity > self.quantity:
            raise ValueError("Reserved quantity cannot exceed total quantity")
        if self.low_stock_threshold < 0:
            raise ValueError("Low stock threshold cannot be negative")

