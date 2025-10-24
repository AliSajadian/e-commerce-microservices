import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .base_schemas import TimestampMixin, UUIDMixin

# ============================================================================
# PRODUCT IMAGE SCHEMAS
# ============================================================================

class ProductImageBaseSchema(BaseModel):
    """Base product image schema"""
    url: str = Field(..., max_length=255, description="Image URL")
    alt_text: Optional[str] = Field(None, max_length=100, description="Alt text for accessibility")
    is_main: bool = Field(False, description="Whether this is the main product image")
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Image URL cannot be empty')
        # Basic URL validation
        if not v.startswith(('http://', 'https://', '/')):
            raise ValueError('Invalid URL format')
        return v

class ProductImageCreateSchema(ProductImageBaseSchema):
    """Schema for creating a product image"""
    product_id: uuid.UUID = Field(..., description="Product ID this image belongs to")

class ProductImageUpdateSchema(BaseModel):
    """Schema for updating a product image"""
    url: Optional[str] = Field(None, max_length=255)
    alt_text: Optional[str] = Field(None, max_length=100)
    is_main: Optional[bool] = None
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Image URL cannot be empty')
            if not v.startswith(('http://', 'https://', '/')):
                raise ValueError('Invalid URL format')
        return v

class ProductImageInDBSchema(UUIDMixin, ProductImageBaseSchema, TimestampMixin):
    """Complete product image schema with database fields"""
    product_id: uuid.UUID
    
    model_config = ConfigDict(from_attributes=True)

class ProductImageSchema(ProductImageInDBSchema):
    """Public product image schema"""
    pass

ProductImageSchema.model_rebuild()


