import uuid 
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .base_schemas import TimestampMixin, UUIDMixin

# ============================================================================
# INVENTORY SCHEMAS
# ============================================================================

class InventoryBaseSchema(BaseModel):
    """Base inventory schema with common fields"""
    quantity: int = Field(..., ge=0, description="Available quantity")
    reserved_quantity: int = Field(default=0, ge=0, description="Reserved quantity")
    warehouse_location: Optional[str] = Field(
        default=None, 
        max_length=255, 
        description="Warehouse storage location"
    )
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        """Validate quantity is not negative"""
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        return v
    
    @field_validator('reserved_quantity') 
    @classmethod
    def validate_reserved_quantity(cls, v):
        """Validate reserved quantity is not negative"""
        if v < 0:
            raise ValueError('Reserved quantity cannot be negative')
        return v

class InventoryCreateSchema(InventoryBaseSchema):
    """Schema for creating inventory"""
    product_id: uuid.UUID = Field(..., description="Product ID (UUID)")
    
    @field_validator('product_id')
    @classmethod
    def validate_product_id(cls, v):
        """Custom validation for product_id"""
        if v is None:
            raise ValueError("Product ID is required and cannot be None")
        return v
    
    # Cross-field validation to ensure reserved_quantity doesn't exceed quantity
    def model_post_init(self, __context) -> None:
        """Validate business rules after all fields are set"""
        if self.reserved_quantity > self.quantity:
            raise ValueError("Reserved quantity cannot exceed available quantity")

class InventoryUpdateSchema(BaseModel):
    """Schema for updating inventory"""
    quantity: Optional[int] = Field(None, ge=0, description="Available quantity")
    reserved_quantity: Optional[int] = Field(None, ge=0, description="Reserved quantity") 
    warehouse_location: Optional[str] = Field(
        None, 
        max_length=255, 
        description="Warehouse storage location"
    )
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        """Validate quantity if provided"""
        if v is not None and v < 0:
            raise ValueError('Quantity cannot be negative')
        return v
    
    @field_validator('reserved_quantity')
    @classmethod  
    def validate_reserved_quantity(cls, v):
        """Validate reserved quantity if provided"""
        if v is not None and v < 0:
            raise ValueError('Reserved quantity cannot be negative')
        return v
    
    # Note: Cross-field validation for updates should be handled in the service layer
    # since we may not have all current values during partial updates

class InventoryInDBSchema(UUIDMixin, InventoryBaseSchema, TimestampMixin):
    """Complete inventory schema with database fields"""
    product_id: uuid.UUID
    
    class Config:
        from_attributes = True

class InventorySchema(InventoryInDBSchema):
    """Public inventory schema for API responses"""
    pass

# Alternative approach if you want to use integer product_id instead of UUID
class InventoryCreateIntSchema(BaseModel):
    """Alternative schema using integer product_id (if that's what you prefer)"""
    product_id: int = Field(..., gt=0, description="Product ID must be a positive integer")
    quantity: int = Field(..., ge=0, description="Available quantity")
    reserved_quantity: int = Field(default=0, ge=0, description="Reserved quantity")
    warehouse_location: Optional[str] = Field(
        default=None, 
        max_length=255, 
        description="Warehouse storage location"
    )
    
    @field_validator('product_id')
    @classmethod
    def validate_product_id(cls, v):
        """Custom validation for product_id"""
        if v is None:
            raise ValueError("Product ID is required and cannot be None")
        if v <= 0:
            raise ValueError("Product ID must be a positive integer")
        return v
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        """Custom validation for quantity"""
        if v is None:
            raise ValueError("Quantity is required and cannot be None")
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        return v
    
    @field_validator('reserved_quantity')
    @classmethod
    def validate_reserved_quantity(cls, v):
        """Custom validation for reserved_quantity"""
        if v < 0:
            raise ValueError('Reserved quantity cannot be negative')
        return v
    
    def model_post_init(self, __context) -> None:
        """Validate business rules after all fields are set"""
        if self.reserved_quantity > self.quantity:
            raise ValueError("Reserved quantity cannot exceed available quantity")

# Rebuild models to ensure proper inheritance
InventorySchema.model_rebuild()

# Example usage and validation scenarios:
"""
Valid create request:
{
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "quantity": 100,
    "reserved_quantity": 10,
    "warehouse_location": "A-1-B-3"
}

Invalid create request (reserved > quantity):
{
    "product_id": "123e4567-e89b-12d3-a456-426614174000", 
    "quantity": 10,
    "reserved_quantity": 20  # ❌ Will raise ValueError
}

Valid update request:
{
    "quantity": 150,
    "warehouse_location": "A-2-C-1"
}

Valid minimal create request:
{
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "quantity": 50
    # reserved_quantity defaults to 0
    # warehouse_location defaults to None
}
"""