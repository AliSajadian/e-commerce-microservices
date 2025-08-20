from dataclasses import dataclass, field
from datetime import datetime

import uuid

# ============================================================================
# BASE ENTITY
# ============================================================================

@dataclass
class BaseEntity:
    """Base entity with common fields"""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def __post_init__(self):
        """Ensure updated_at is set when created_at changes"""
        if not hasattr(self, '_created_at_original'):
            self._created_at_original = self.created_at
