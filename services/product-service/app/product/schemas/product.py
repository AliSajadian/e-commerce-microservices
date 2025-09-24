from __future__ import annotations
import uuid
from typing import TYPE_CHECKING, List, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
import re
from .base_schemas import TimestampMixin, UUIDMixin
from . import CategoryInDBSchema, InventorySchema, ProductImageSchema, TagSchema

# Only import for type checking, not runtime
if TYPE_CHECKING:
    from .category import CategoryInDBSchema
    from .tag import TagSchema
    from .inventory import InventorySchema
    from .product_image import ProductImageSchema
 
# ============================================================================
# PRODUCT SCHEMAS
# ============================================================================

class ProductImageCreateSchema(BaseModel):
    """Schema for creating a product image."""
    url: str = Field(..., description="URL of the product image")
    alt_text: str = Field(..., description="Alternative text for the image")
    is_main: bool = Field(False, description="Whether this is the main image")

class ProductBaseSchema(BaseModel):
    """Base product schema with shared fields"""
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    description: Optional[str] = Field(None, max_length=1000, description="Product description")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Product price")
    sku: str = Field(..., min_length=1, description="Stock Keeping Unit")
    is_active: bool = Field(True, description="Whether product is active")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Product name cannot be empty')
        return v
    
    @field_validator('sku')
    @classmethod
    def validate_sku(cls, v):
        v = v.strip().upper()
        if not v:
            raise ValueError('SKU cannot be empty')
        # SKU should be alphanumeric with optional hyphens/underscores
        if not re.match(r'^[A-Z0-9_-]+$', v):
            raise ValueError('SKU must contain only letters, numbers, hyphens, and underscores')
        return v
    
    # @field_validator('price')
    # @classmethod
    # def validate_price(cls, v):
    #     if v <= 0:
    #         raise ValueError('Price must be greater than 0')
    #     return v

class ProductCreateSchema(ProductBaseSchema):
    """Schema for creating a product"""
    category_id: uuid.UUID = Field(default_factory=list, description="Category ID")
    tag_ids: List[uuid.UUID] = Field(default_factory=list, description="Tag IDs")
    initial_quantity: Optional[int] = Field(0, ge=0, description="Initial inventory quantity")
    reserved_quantity: Optional[int] = Field(0, ge=0, description="Initial inventory quantity")
    warehouse_location: Optional[str] = Field(..., description="Warehouse location for the product inventory")
    images: Optional[List[ProductImageCreateSchema]] = Field(default_factory=list, description="Product images")

class ProductUpdateSchema(BaseModel):
    """Schema for updating a product"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    sku: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None
    tag_ids: Optional[List[uuid.UUID]] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Product name cannot be empty')
        return v
    
    @field_validator('sku')
    @classmethod
    def validate_sku(cls, v):
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError('SKU cannot be empty')
            if not re.match(r'^[A-Z0-9_-]+$', v):
                raise ValueError('SKU must contain only letters, numbers, hyphens, and underscores')
        return v
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Price must be greater than 0')
        return v

class ProductInDBSchema(UUIDMixin, ProductBaseSchema, TimestampMixin):
    """Complete product schema with database fields"""
    
    model_config = ConfigDict(from_attributes=True)

class ProductSchema(ProductInDBSchema):
    """Public product schema with all relationships"""
    images: List['ProductImageSchema'] = Field(default_factory=list)
    inventory: Optional['InventorySchema'] = None
    category: Optional['CategoryInDBSchema'] = None
    tags: List['TagSchema'] = Field(default_factory=list)

class ProductSummarySchema(ProductInDBSchema):
    """Product summary schema without relationships (for lists)"""
    main_image_url: Optional[str] = None
    category_name: Optional[str] = None
    in_stock: bool = False
    stock_quantity: Optional[int] = None
    
# ============================================================================
# QUERY SCHEMAS
# ============================================================================

class ProductFilterSchema(BaseModel):
    """Schema for filtering products"""
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    tag_id: Optional[uuid.UUID] = None
    min_price: Optional[Decimal] = Field(None, ge=0)
    max_price: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None
    in_stock: Optional[bool] = None
    sku: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def validate_price_range(cls, values):
        min_price = values.get('min_price')
        max_price = values.get('max_price')
        if min_price is not None and max_price is not None:
            if min_price > max_price:
                raise ValueError('min_price cannot be greater than max_price')
        return values

class PaginationParamsSchema(BaseModel):
    """Schema for pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="Sort order")

class PaginatedResponseSchema(BaseModel):
    """Generic paginated response schema"""
    items: List[BaseModel]
    total: int
    page: int
    size: int
    pages: int

# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class ProductDetailSchema(ProductSchema):
    """Detailed product view with all relationships"""
    related_products: List['ProductSummarySchema'] = Field(default_factory=list)

ProductSchema.model_rebuild()


