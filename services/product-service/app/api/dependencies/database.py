#  /app/api/dependencies/database.py
from typing import Annotated
from fastapi import Depends
# from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import AsyncSessionLocal
from ...product.crud import CategoryCRUD, InventoryCRUD, ProductCRUD, ProductImageCRUD, TagCRUD

# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()
        
# DbSession = Annotated[Session, Depends(get_db)]

async def async_get_db():
    async with AsyncSessionLocal() as db:
        yield db
        
AsyncDbSession = Annotated[AsyncSession, Depends(async_get_db)]

def get_category_service(
    db_session: AsyncSession = Depends(async_get_db)
) -> CategoryCRUD:
    """Dependency for CategoryCRUD."""
    return CategoryCRUD(db_session)

def get_tag_service(
    db_session: AsyncSession = Depends(async_get_db)
) -> TagCRUD:
    """Dependency for TagCRUD."""
    return TagCRUD(db_session)

def get_product_service(
    db_session: AsyncSession = Depends(async_get_db),
    category_service: CategoryCRUD = Depends(get_category_service)
) -> ProductCRUD:
    """Dependency for ProductCRUD."""
    return ProductCRUD(db_session, category_service)

def get_inventory_service(
    db_session: AsyncSession = Depends(async_get_db)
    # product_service: ProductCRUD = Depends(get_product_service)
) -> InventoryCRUD:
    """Dependency for InventoryCRUD with ProductCRUD injection."""
    return InventoryCRUD(db_session) #), product_service)

def get_product_image_service(
    db_session: AsyncSession = Depends(async_get_db),
    product_service: ProductCRUD = Depends(get_product_service)
) -> ProductImageCRUD:
    """Dependency for ProductImageCRUD."""
    return ProductImageCRUD(db_session, product_service)



