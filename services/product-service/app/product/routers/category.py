from http import HTTPStatus
from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Path

from ..crud import CategoryCRUD
from ..schemas import CategoryCreateSchema, CategorySchema, CategoryUpdateSchema, ProductSchema
from ...api.dependencies.database import AsyncDbSession, get_category_service

from ...api.dependencies.auth_utils import get_current_user_id

# ============================================================================
# Category router Endpoints
# ============================================================================

routers = APIRouter()

@routers.post("", status_code=HTTPStatus.CREATED)
async def create_category(
    category_data: CategoryCreateSchema,
    category_service: CategoryCRUD = Depends(get_category_service)
) -> CategorySchema:
    """API endpoint for creating a category resource

    Args:
        category_data (CategoryCreateModel): data for creating a category using the category schema

    Returns:
        dict: category that has been created
    """
    return await category_service.create_category(category_data)    

@routers.get("/tree", response_model=List[CategorySchema])
async def get_category_tree(    
    category_service: CategoryCRUD = Depends(get_category_service)
) -> List[CategorySchema]:
    """API endpoint for listing all category hierarchy
    """
    categories = await category_service.read_category_tree()
    return [CategorySchema.model_validate(cat) for cat in categories]

@routers.get("/{category_id}")
async def get_category(    
    category_service: CategoryCRUD = Depends(get_category_service), 
    category_id: uuid.UUID = Path(..., description="The category id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
    # This dependency will run first, and if it succeeds, it will
    # pass the user_id to the handler.
    user_id: str = Depends(get_current_user_id) 
) -> CategorySchema:
    """API endpoint for retrieving a category by its ID

    Args:
        category_id (int): the ID of the category to retrieve

    Returns:
        dict: The retrieved category
    """
    category = await category_service.read_category_by_id(category_id)
    return CategorySchema.model_validate(category)

@routers.patch("/{category_id}")
async def update_category(    
    data_category: CategoryUpdateSchema, 
    category_service: CategoryCRUD = Depends(get_category_service),
    category_id: uuid.UUID = Path(..., description="The category id, you want to update: ")
) -> CategorySchema:
    """Update by ID

    Args:
        category_id (int): ID of category to update
        data (CategoryCreateModel): data to update category

    Returns:
        dict: the updated category
    """
    category = await category_service.update_category( 
        category_id, 
        data_category=data_category.model_dump(exclude_unset=True)
    )
    return CategorySchema.model_validate(category)

@routers.delete("/{category_id}", status_code=HTTPStatus.OK)
async def delete_category(    
    category_service: CategoryCRUD = Depends(get_category_service),
    category_id: uuid.UUID = Path(..., description="The category id, you want to delete: ")
) -> bool:
    """
    Delete category by id

    Args:
        category_id (UUID): ID of category to delete
        
    Return: bool
    """
    return await category_service.delete_category(category_id)
    

