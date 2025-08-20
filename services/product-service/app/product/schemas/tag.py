from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .base_schemas import TimestampMixin, UUIDMixin

# ============================================================================
# TAG SCHEMAS
# ============================================================================

class TagBaseSchema(BaseModel):
    """Base tag schema with shared fields"""
    name: str = Field(..., min_length=1, max_length=100, description="Tag name")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Tag name cannot be empty')
        return v.lower()  # Normalize to lowercase

class TagCreateSchema(TagBaseSchema):
    """Schema for creating a tag"""
    pass

class TagUpdateSchema(BaseModel):
    """Schema for updating a tag"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Tag name cannot be empty')
            return v.lower()
        return v

class TagInDBSchema(UUIDMixin, TagBaseSchema, TimestampMixin):
    """Complete tag schema with database fields"""
    
    class Config:
        from_attributes = True

class TagSchema(TagInDBSchema):
    """Public tag schema"""
    pass

TagSchema.model_rebuild()

