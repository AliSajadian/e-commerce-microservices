from __future__ import annotations

# Import base/simple schemas first
from .tag import *
from .inventory import *
from .category import *
from .product_image import *
# Import complex schemas that depend on others LAST
from .product import *

# Rebuild models to resolve string references
# def rebuild_models():
#     """Rebuild all models to resolve forward references"""
#     # Import here to avoid circular imports
#     from . import category, product
    
#     # Rebuild models that have forward references
#     category.Category.model_rebuild()
#     product.Product.model_rebuild()
#     product.ProductSummary.model_rebuild()
#     product.ProductDetail.model_rebuild()

# # Call rebuild after all imports
# rebuild_models()

__all__ = [
    # Tag exports
    "Tag", "TagCreate", "TagUpdate", "TagInDB",
    # Category exports  
    "Category", "CategoryCreate", "CategoryUpdate", "CategoryInDB", "CategoryWithProducts",
    # ProductImage exports
    "ProductImage", "ProductImageCreate", "ProductImageUpdate", "ProductImageInDB",
    # Inventory exports
    "Inventory", "InventoryCreate", "InventoryUpdate", "InventoryInDB",
    # Product exports
    "Product", "ProductCreate", "ProductUpdate", "ProductInDB", "ProductSummary", "ProductDetail",
]