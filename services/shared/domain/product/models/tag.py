from dataclasses import dataclass
from typing import Optional
from datetime import datetime

from . import BaseEntity

# ============================================================================
# TAG MODEL
# ============================================================================

@dataclass
class Tag(BaseEntity):
    """
    Tag domain model - flexible product labeling
    """
    name: str
    description: str = ""
    color: Optional[str] = None  # Hex color code for UI
    is_active: bool = True
    
    def __post_init__(self):
        super().__post_init__()
        # Normalize tag name
        self.name = self.name.strip().lower()
        if self.color:
            self._validate_color()
    
    def _validate_color(self) -> None:
        """Validate hex color format"""
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', self.color):
            raise ValueError(f"Invalid color format: {self.color}")
    
    def activate(self) -> None:
        """Activate the tag"""
        self.is_active = True
        self.updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        """Deactivate the tag"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def validate(self) -> None:
        """Validate tag business rules"""
        if not self.name.strip():
            raise ValueError("Tag name cannot be empty")
        if len(self.name) > 50:
            raise ValueError("Tag name cannot exceed 50 characters")


