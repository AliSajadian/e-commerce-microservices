from enum import Enum

class ProductState(Enum):
    """Product status enumeration"""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"
    
class ProductStatus(Enum):
    """Product lifecycle and visibility statuses."""
    
    # Lifecycle states
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    
    # Availability states
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    COMING_SOON = "coming_soon"
    DISCONTINUED = "discontinued"
    
    # Special states
    FEATURED = "featured"
    ON_SALE = "on_sale"
    CLEARANCE = "clearance"
    SEASONAL = "seasonal"
    
    # Visibility states
    PUBLIC = "public"
    PRIVATE = "private"           # Visible only to specific users/groups
    HIDDEN = "hidden"            # Hidden from catalog but accessible via direct link
    
    # Quality states
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"
    APPROVED = "approved"
    
    @property
    def is_publicly_visible(self) -> bool:
        """Check if product is visible in public catalog."""
        return self in {
            self.ACTIVE,
            self.AVAILABLE,
            self.FEATURED,
            self.ON_SALE,
            self.CLEARANCE,
            self.PUBLIC,
            self.APPROVED
        }
    
    @property
    def is_purchasable(self) -> bool:
        """Check if product can be purchased."""
        return self in {
            self.ACTIVE,
            self.AVAILABLE,
            self.FEATURED,
            self.ON_SALE,
            self.CLEARANCE
        }
    
    @property
    def requires_approval(self) -> bool:
        """Check if product status requires approval workflow."""
        return self in {
            self.DRAFT,
            self.PENDING_REVIEW,
            self.NEEDS_REVIEW
        }