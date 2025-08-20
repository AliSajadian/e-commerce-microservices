from http import HTTPStatus
from fastapi import APIRouter
from typing import List

from ..schemas import ProductImageSchema, ProductImageCreateSchema, ProductImageUpdateSchema
from ..crud import ProductImageCRUD
from ...api.dependencies.database import AsyncDbSession

# ============================================================================
# ProductImages router endpoints
# ============================================================================

routers = APIRouter()

@routers.post("/", status_code=HTTPStatus.CREATED)
async def create_product_image(db: AsyncDbSession, data: ProductImageCreateSchema):
    """API endpoint for creating a product image resource

    Args:
        product image data (ProductImageCreateModel): data for creating a product image using the product image schema

    Returns:
        dict: product image that has been created
    """
    services = ProductImageCRUD(db)
    return await services.create_image(data)

@routers.get("/", response_model=List[ProductImageSchema])
async def get_all_images(db: AsyncDbSession):
    """API endpoint for listing all product_image resources
    """
    services = ProductImageCRUD(db)
    return await services.read_all_images()

@routers.get("/{product_image_id}", response_model=ProductImageSchema)
async def get_image_by_id(db: AsyncDbSession, product_image_id: str):
    """API endpoint for retrieving a product_image by its ID

    Args:
        product_image_id (int): the ID of the product_image to retrieve

    Returns:
        dict: The retrieved product_image
    """
    services = ProductImageCRUD(db)
    product_image = await services.read_image_by_id(product_image_id)
    return product_image

@routers.put("/{product_image_id}", response_model=ProductImageSchema)
async def update_image(db: AsyncDbSession, product_image_id: str, data: ProductImageUpdateSchema):
    """Update by ID

    Args:
        author_id (int): ID of author to update
        data (AuthorCreateModel): data to update author

    Returns:
        dict: the updated author
    """
    services = ProductImageCRUD(db)
    updated = await services.update_image(data, product_image_id)
    return updated

@routers.delete("/{product_image_id}")
async def delete_image(db: AsyncDbSession, product_image_id: str):
    """Delete author by id

    Args:
        author_id (str): ID of author to delete
    """
    services = ProductImageCRUD(db)
    deleted = await services.delete_image(product_image_id)
    return deleted

