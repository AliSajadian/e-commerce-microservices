from fastapi import APIRouter,  HTTPException, Path, status, Depends
from typing import List
import uuid

from app.api.dependencies.database import AsyncDbSession
from app.api.dependencies.auth_utils import has_permission
from app.product.schemas import ProductCreateSchema, ProductUpdateSchema, ProductSchema, InventorySchema, ProductImageSchema
from app.product.crud import ProductCRUD

# ============================================================================
# Product router Endpoints
# ============================================================================

routers = APIRouter()

@routers.post("/", response_model=ProductSchema, status_code=status.HTTP_201_CREATED)
async def create_product(db_session: AsyncDbSession, 
                         product_in: ProductCreateSchema) -> ProductSchema:
    """
    Create a new product with initial stock and link to categories/tags.
    """
    crud = ProductCRUD(db_session)
    product = await crud.create_product(product_in)
    return product

@routers.get("/", response_model=List[ProductSchema])
async def get_all_products(db_session: AsyncDbSession, 
                           skip: int = 0, 
                           limit: int = 100) -> List[ProductSchema]:
    """
    Retrieve a list of all products.
    """
    crud = ProductCRUD(db_session)
    products = await crud.read_all_products(skip=skip, limit=limit)
    return products

@routers.get("/{product_id}", response_model=ProductSchema)
async def get_product(db_session: AsyncDbSession, 
                      product_id: uuid.UUID, 
                      claims: dict = Depends(has_permission("product:read"))) -> ProductSchema:
    """
    Retrieve a product by its ID.
    """
    crud = ProductCRUD(db_session)
    product = await crud.read_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@routers.get("/{product_id}/imagres", response_model=ProductSchema)
async def get_product_images(db_session: AsyncDbSession, 
                             product_id: uuid.UUID) -> List[ProductImageSchema]:
    """
    Retrieve product images by its ID.
    """
    crud = ProductCRUD(db_session)
    product_images = await crud.read_images_by_product_id(product_id)
    return product_images

@routers.put("/{product_id}", response_model=ProductSchema)
async def update_product(db_session: AsyncDbSession, 
                         product_id: uuid.UUID, 
                         product_in: ProductUpdateSchema) -> ProductSchema:
    """
    Update an existing product by its ID.
    """
    crud = ProductCRUD(db_session)
    product = await crud.update_product(product_id, product_in)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@routers.patch("/{product_id}/stock", response_model=ProductSchema)
async def update_product_stock(db_session: AsyncDbSession, 
                               quantity_change: int, 
                               product_id: uuid.UUID = Path(..., description="The tag id, you want to update: ")) -> InventorySchema:
    """
    Update the stock quantity of a product.
    Provide a positive number to add stock, or a negative number to remove stock.
    """
    crud = ProductCRUD(db_session)
    
    # First, get the product to ensure it exists and to return the full ProductResponse
    product = await crud.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Update the stock via the CRUD method
    updated_inventory = await crud.update_product_stock(product_id, quantity_change)
    
    if not updated_inventory:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory for product not found")

    # Refresh the product object to reflect the updated inventory quantity
    await db_session.refresh(product, attribute_names=["inventory"])
    return product

@routers.delete("/{product_id}", status_code=status.HTTP_200_OK)
async def delete_product(db_session: AsyncDbSession, 
                         product_id: uuid.UUID = Path(..., description="The tag id, you want to delete: ")) -> bool:
    """
    Delete a product by its ID.
    """
    crud = ProductCRUD(db_session)
    deleted = await crud.delete_product(product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return {"message": "Product deleted successfully"}


