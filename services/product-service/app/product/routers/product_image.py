from http import HTTPStatus
from fastapi import APIRouter, Depends
from typing import List
import uuid

from ..schemas import ProductImageSchema, ProductImageCreateSchema, ProductImageUpdateSchema
from ..crud import ProductImageCRUD, ProductCRUD
from ...api.dependencies.database import get_product_image_service

# ============================================================================
# ProductImages router endpoints
# ============================================================================

routers = APIRouter()

@routers.post("/", status_code=HTTPStatus.CREATED)
async def create_product_image(
    data: ProductImageCreateSchema,
    product_image_service: ProductImageCRUD = Depends(get_product_image_service)
) -> ProductImageSchema:
    """API endpoint for creating a product image resource

    Args:
        product image data (ProductImageCreateModel): data for creating a product image using the product image schema

    Returns:
        dict: product image that has been created
    """
    product_image = await product_image_service.create_image(data)
    return ProductImageSchema.model_validate(product_image)

@routers.get("/", response_model=List[ProductImageSchema])
async def get_all_images(
    product_image_service: ProductImageCRUD = Depends(get_product_image_service)
) -> List[ProductImageSchema]:
    """API endpoint for listing all product_image resources
    """
    product_images = await product_image_service.read_all_images()
    return [ProductImageSchema.model_validate(img) for img in product_images]

@routers.get("/{product_image_id}", response_model=ProductImageSchema)
async def get_image_by_id(
    product_image_id: str,
    product_image_service: ProductImageCRUD = Depends(get_product_image_service)
) -> ProductImageSchema:
    """API endpoint for retrieving a product_image by its ID

    Args:
        product_image_id (int): the ID of the product_image to retrieve

    Returns:
        dict: The retrieved product_image
    """
    product_image = await product_image_service.read_image_by_id(product_image_id)
    return ProductImageSchema.model_validate(product_image)

@routers.get("/{product_id}/images", response_model=List[ProductImageSchema])
async def get_product_images(
    product_id: uuid.UUID,
    product_image_service: ProductImageCRUD = Depends(get_product_image_service)
) -> List[ProductImageSchema]:
    """
    Retrieve product images by its ID.
    """
    product_images = await product_image_service.read_images_by_product_id(product_id)
    return [ProductImageSchema.model_validate(img) for img in product_images]

@routers.put("/{product_image_id}", response_model=ProductImageSchema)
async def update_image(
    product_image_id: str, 
    data: ProductImageUpdateSchema,
    product_image_service: ProductImageCRUD = Depends(get_product_image_service)
 ) -> ProductImageSchema:
    """Update by ID

    Args:
        author_id (int): ID of author to update
        data (AuthorCreateModel): data to update author

    Returns:
        dict: the updated author
    """
    updated = await product_image_service.update_image(data, product_image_id)
    return ProductImageSchema.model_validate(updated)

@routers.delete("/{product_image_id}", status_code=HTTPStatus.OK)
async def delete_image(
    product_image_id: str,
    product_image_service: ProductImageCRUD = Depends(get_product_image_service)
 ) -> bool:
    """Delete author by id

    Args:
        author_id (str): ID of author to delete
        
    Return:
        bool
    """
    return await product_image_service.delete_image(product_image_id)
    

