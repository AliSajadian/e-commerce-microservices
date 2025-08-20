from __future__ import annotations
from datetime import datetime
import uuid
from pydantic import BaseModel

# ============================================================================
# BASE SCHEMAS
# ============================================================================

class TimestampMixin(BaseModel):
    """Base timestamp mixin for all entities"""
    created_at: datetime
    updated_at: datetime

class UUIDMixin(BaseModel):
    """Base UUID mixin for all entities"""
    id: uuid.UUID