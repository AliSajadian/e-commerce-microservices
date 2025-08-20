# /shared/product/enums/category_type.py
from enum import Enum


class CategoryType(Enum):
    """Category type enumeration for hierarchical categorization"""
    
    ROOT = "root"
    CHILD = "child"
    LEAF = "leaf"
    
    def __str__(self) -> str:
        return self.value
    
    @classmethod
    def get_display_names(cls) -> dict:
        """Get display names for each category type"""
        return {
            cls.ROOT: "Root Category",
            cls.CHILD: "Child Category", 
            cls.LEAF: "Leaf Category"
        }
    
    @property
    def display_name(self) -> str:
        """Get display name for this category type"""
        return self.get_display_names().get(self, self.value.title())
    
    @property
    def can_have_children(self) -> bool:
        """Check if this category type can have child categories"""
        return self in [CategoryType.ROOT, CategoryType.CHILD]
    
    @property
    def requires_parent(self) -> bool:
        """Check if this category type requires a parent"""
        return self in [CategoryType.CHILD, CategoryType.LEAF]
    
    @classmethod
    def from_string(cls, value: str) -> 'CategoryType':
        """Create CategoryType from string value"""
        for category_type in cls:
            if category_type.value.lower() == value.lower():
                return category_type
        raise ValueError(f"Invalid category type: {value}")


