from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import uuid

from . import BaseEntity

# ============================================================================
# PRODUCT IMAGE MODEL
# ============================================================================

@dataclass
class ProductImage(BaseEntity):
    """
    Product Image domain model - product visual assets
    """
    product_id: uuid.UUID
    url: str
    alt_text: str
    is_main: bool = False
    display_order: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None  # in bytes
    
    def __post_init__(self):
        super().__post_init__()
        self._validate_url()
    
    def _validate_url(self) -> None:
        """Basic URL validation"""
        if not self.url.strip():
            raise ValueError("Image URL cannot be empty")
        
        # Basic URL format check
        valid_schemes = ['http', 'https', 's3', 'cloudinary']
        if not any(self.url.startswith(f'{scheme}://') for scheme in valid_schemes):
            raise ValueError("Invalid image URL format")
    
    def set_as_main(self) -> None:
        """Set this image as the main image"""
        self.is_main = True
        self.updated_at = datetime.utcnow()
    
    def unset_as_main(self) -> None:
        """Unset this image as main image"""
        self.is_main = False
        self.updated_at = datetime.utcnow()
    
    def update_order(self, new_order: int) -> None:
        """Update display order"""
        if new_order < 0:
            raise ValueError("Display order cannot be negative")
        
        self.display_order = new_order
        self.updated_at = datetime.utcnow()
    
    def get_file_size_mb(self) -> Optional[float]:
        """Get file size in megabytes"""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None
    
    def validate(self) -> None:
        """Validate product image business rules"""
        if not self.alt_text.strip():
            raise ValueError("Alt text cannot be empty")
        if self.display_order < 0:
            raise ValueError("Display order cannot be negative")
        if self.width and self.width <= 0:
            raise ValueError("Width must be positive")
        if self.height and self.height <= 0:
            raise ValueError("Height must be positive")
        if self.file_size and self.file_size <= 0:
            raise ValueError("File size must be positive")
