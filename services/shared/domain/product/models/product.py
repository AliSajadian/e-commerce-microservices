from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from . import *

# ============================================================================
# PRODUCT MODEL
# ============================================================================

@dataclass
class Product(BaseEntity):
    """
    Product domain model - core business entity
    """
    name: str
    sku: str  # Stock Keeping Unit - unique identifier
    description: str
    price: Decimal
    is_active: bool = True
    
    # Relationships (will be loaded by repositories)
    categories: List['Category'] = field(default_factory=list)
    tags: List['Tag'] = field(default_factory=list)
    images: List['ProductImage'] = field(default_factory=list)
    
    # Business methods
    def activate(self) -> None:
        """Activate the product"""
        self.is_active = True
        self.updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        """Deactivate the product"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def update_price(self, new_price: Decimal) -> None:
        """Update product price with validation"""
        if new_price < 0:
            raise ValueError("Price cannot be negative")
        self.price = new_price
        self.updated_at = datetime.utcnow()
    
    def add_category(self, category: 'Category') -> None:
        """Add category to product"""
        if category not in self.categories:
            self.categories.append(category)
            self.updated_at = datetime.utcnow()
    
    def remove_category(self, category: 'Category') -> None:
        """Remove category from product"""
        if category in self.categories:
            self.categories.remove(category)
            self.updated_at = datetime.utcnow()
    
    def add_tag(self, tag: 'Tag') -> None:
        """Add tag to product"""
        if tag not in self.tags:
            self.tags.append(tag)
            self.updated_at = datetime.utcnow()
    
    def remove_tag(self, tag: 'Tag') -> None:
        """Remove tag from product"""
        if tag in self.tags:
            self.tags.remove(tag)
            self.updated_at = datetime.utcnow()
    
    def get_main_image(self) -> Optional['ProductImage']:
        """Get the main product image"""
        main_images = [img for img in self.images if img.is_main]
        return main_images[0] if main_images else None
    
    def validate(self) -> None:
        """Validate product business rules"""
        if not self.name.strip():
            raise ValueError("Product name cannot be empty")
        if not self.sku.strip():
            raise ValueError("Product SKU cannot be empty")
        if self.price < 0:
            raise ValueError("Product price cannot be negative")
        if len(self.categories) == 0:
            raise ValueError("Product must belong to at least one category")


