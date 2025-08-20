from __future__ import annotations
import uuid
from typing import TYPE_CHECKING, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
import re
from .base_schemas import TimestampMixin, UUIDMixin

# Only import for type checking, not runtime
if TYPE_CHECKING:
    from .product import ProductSummarySchema
# ============================================================================
# CATEGORY SCHEMAS
# ============================================================================

class CategoryBaseSchema(BaseModel):
    """Base category schema with shared fields"""
    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    slug: str = Field(..., min_length=1, max_length=200, description="URL-friendly slug")
    description: Optional[str] = Field(None, description="Category description")
    parent_id: Optional[uuid.UUID] = Field(None, description="Parent category ID")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Category name cannot be empty')
        return v
    
    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v):
        v = v.strip().lower()
        if not v:
            raise ValueError('Slug cannot be empty')
        # Validate slug format (URL-friendly)
        if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', v):
            raise ValueError('Slug must be URL-friendly (lowercase letters, numbers, hyphens only)')
        return v

class CategoryCreateSchema(CategoryBaseSchema):
    """Schema for creating a category"""
    
    @model_validator(mode='before')
    @classmethod
    def generate_slug_if_missing(cls, values):
        """Auto-generate slug from name if not provided"""
        if not values.get('slug') and values.get('name'):
            # Simple slug generation
            slug = re.sub(r'[^\w\s-]', '', values['name'].lower())
            slug = re.sub(r'[-\s]+', '-', slug).strip('-')
            values['slug'] = slug
        return values

class CategoryUpdateSchema(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Category name cannot be empty')
        return v
    
    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v):
        if v is not None:
            v = v.strip().lower()
            if not v:
                raise ValueError('Slug cannot be empty')
            if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', v):
                raise ValueError('Slug must be URL-friendly')
        return v

class CategoryInDBSchema(UUIDMixin, CategoryBaseSchema, TimestampMixin):
    """Complete category schema with database fields"""
    
    class Config:
        from_attributes = True

class CategorySchema(CategoryInDBSchema):
    """Public category schema with relationships"""
    parent: Optional[CategorySchema] = None
    children: List[CategorySchema] = Field(default_factory=list)

# In schemas/category.py
class CategoryWithProductsSchema(CategorySchema):
    """Category with products (for category detail endpoint)"""
    products: List['ProductSummarySchema'] = Field(default_factory=list)
    
# Enable forward references for self-referencing relationship
CategorySchema.model_rebuild()
