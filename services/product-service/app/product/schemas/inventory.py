import uuid 
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .base_schemas import TimestampMixin, UUIDMixin

# ============================================================================
# INVENTORY SCHEMAS
# ============================================================================

class InventoryBaseSchema(BaseModel):
    """Base inventory schema"""
    quantity: int = Field(..., ge=0, description="Available quantity")
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        return v

class InventoryCreateSchema(InventoryBaseSchema):
    """Schema for creating inventory"""
    product_id: uuid.UUID = Field(..., description="Product ID")

class InventoryUpdateSchema(BaseModel):
    """Schema for updating inventory"""
    quantity: Optional[int] = Field(None, ge=0, description="Available quantity")
    
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        if v is not None and v < 0:
            raise ValueError('Quantity cannot be negative')
        return v

class InventoryInDBSchema(UUIDMixin, InventoryBaseSchema, TimestampMixin):
    """Complete inventory schema with database fields"""
    product_id: uuid.UUID
    
    class Config:
        from_attributes = True

class InventorySchema(InventoryInDBSchema):
    """Public inventory schema"""
    pass

InventorySchema.model_rebuild()

