from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
import uuid

from . import BaseEntity

# ============================================================================
# CATEGORY MODEL
# ============================================================================

@dataclass
class Category(BaseEntity):
    """
    Category domain model - hierarchical product organization
    """
    name: str
    slug: str  # URL-friendly identifier
    description: str
    parent_id: Optional[uuid.UUID] = None
    is_active: bool = True
    display_order: int = 0
    
    # Relationships
    parent: Optional['Category'] = None
    children: List['Category'] = field(default_factory=list)
    
    def __post_init__(self):
        super().__post_init__()
        # Validate slug format
        if not self._is_valid_slug(self.slug):
            raise ValueError(f"Invalid slug format: {self.slug}")
    
    def _is_valid_slug(self, slug: str) -> bool:
        """Validate slug contains only lowercase, numbers, hyphens"""
        import re
        return bool(re.match(r'^[a-z0-9-]+$', slug))
    
    def activate(self) -> None:
        """Activate the category"""
        self.is_active = True
        self.updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        """Deactivate the category"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def is_root_category(self) -> bool:
        """Check if this is a root category (no parent)"""
        return self.parent_id is None
    
    def is_child_of(self, potential_parent: 'Category') -> bool:
        """Check if this category is a child of the given category"""
        return self.parent_id == potential_parent.id
    
    def get_ancestors(self) -> List['Category']:
        """Get all ancestor categories (path to root)"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors
    
    def get_full_path(self) -> str:
        """Get full category path (e.g., 'Electronics > Phones > Smartphones')"""
        ancestors = self.get_ancestors()
        path_names = [cat.name for cat in ancestors] + [self.name]
        return ' > '.join(path_names)
    
    def can_be_parent_of(self, child_category: 'Category') -> bool:
        """Check if this category can be parent of another category"""
        # Prevent circular references
        if child_category.id == self.id:
            return False
        
        # Check if this category is a descendant of the child
        ancestors = self.get_ancestors()
        return child_category not in ancestors
    
    def validate(self) -> None:
        """Validate category business rules"""
        if not self.name.strip():
            raise ValueError("Category name cannot be empty")
        if not self.slug.strip():
            raise ValueError("Category slug cannot be empty")
