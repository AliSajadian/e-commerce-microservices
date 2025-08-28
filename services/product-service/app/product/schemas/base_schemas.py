from __future__ import annotations
from datetime import datetime
import uuid
from pydantic import BaseModel

# ============================================================================
# BASE SCHEMAS
# ============================================================================

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class UUIDMixin(BaseModel):
    """Mixin for models that use UUID as primary key"""
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        description="Unique identifier (UUID4)"
    )

class TimestampMixin(BaseModel):
    """Mixin for models with timestamp tracking"""
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        description="Last update timestamp"
    )

class UUIDMixinRequired(BaseModel):
    """Mixin when UUID is required (for database responses)"""
    id: uuid.UUID = Field(..., description="Unique identifier")

class UUIDMixinOptional(BaseModel):
    """Mixin when UUID might not be present (for partial updates)"""
    id: Optional[uuid.UUID] = Field(None, description="Unique identifier")

class UUIDMixinReadOnly(BaseModel):
    """Mixin for read-only UUID (database responses)"""
    id: uuid.UUID = Field(..., description="Unique identifier", frozen=True)


# ============================================================================
# WHEN TO USE WHICH SCHEMA - DECISION GUIDE
# ============================================================================

"""
DECISION MATRIX: InventoryCreateSchema vs InventoryCreateIntSchema

┌─────────────────────────┬─────────────────┬──────────────────────┐
│ Database Design         │ Product ID Type │ Schema to Use        │
├─────────────────────────┼─────────────────┼──────────────────────┤
│ Modern microservices    │ UUID            │ InventoryCreateSchema│
│ Legacy system           │ Integer         │ InventoryCreateIntSchema│
│ High-scale distributed  │ UUID            │ InventoryCreateSchema│
│ Simple monolith         │ Integer         │ InventoryCreateIntSchema│
└─────────────────────────┴─────────────────┴──────────────────────┘
"""


