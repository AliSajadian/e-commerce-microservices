from http import HTTPStatus
from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Path

from ..crud import CategoryCRUD
from ..schemas import CategoryCreateSchema, CategorySchema, CategoryUpdateSchema, ProductSchema
from ...api.dependencies.database import AsyncDbSession

from ...api.dependencies.auth_utils import get_current_user_id

# ============================================================================
# Category router Endpoints
# ============================================================================

routers = APIRouter()

@routers.post("", status_code=HTTPStatus.CREATED)
async def create_category(db: AsyncDbSession, category_data: CategoryCreateSchema) -> CategorySchema:
    """API endpoint for creating a category resource

    Args:
        category_data (CategoryCreateModel): data for creating a category using the category schema

    Returns:
        dict: category that has been created
    """
    new_category = CategorySchema(
        name=category_data.name, 
        parent_id=category_data.parent_id if category_data.parent_id else None
    )
    category_services = CategoryCRUD(db)
    category = await category_services.create_category(new_category)    
    return category

@routers.get("/tree", response_model=List[CategorySchema])
async def get_category_tree(db: AsyncDbSession) -> List[CategorySchema]:
    """API endpoint for listing all category hierarchy
    """
    category_services = CategoryCRUD(db)
    categories = await category_services.read_category_tree()
    return [CategorySchema.model_validate(cat) for cat in categories]

@routers.get("/{category_id}")
async def get_category(db: AsyncDbSession, 
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
    category_services = CategoryCRUD(db)
    category = await category_services.read_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return CategorySchema.model_validate(category)

@routers.get("/{category_id}/products")
async def get_category_products(db: AsyncDbSession, 
    category_id: uuid.UUID = Path(..., description="The category id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
) -> List[ProductSchema]:
    """API endpoint for retrieving a category by its ID

    Args:
        category_id (UUID): the ID of the category to retrieve

    Returns:
        dict: The retrieved roles
    """
    category_services = CategoryCRUD(db)
    roles = await category_services.read_products_by_category_id(category_id)
    return roles

@routers.patch("/{category_id}")
async def update_category(db: AsyncDbSession, data: CategoryUpdateSchema, 
                      category_id: uuid.UUID = Path(..., description="The category id, you want to update: ")) -> CategorySchema:
    """Update by ID

    Args:
        category_id (int): ID of category to update
        data (CategoryCreateModel): data to update category

    Returns:
        dict: the updated category
    """
    category_services = CategoryCRUD(db)
    category = await category_services.update_category( 
        category_id, 
        data=data.model_dump(exclude_unset=True)
    )
    return category

@routers.delete("/{category_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_category(db: AsyncDbSession, category_id: uuid.UUID = Path(..., description="The category id, you want to delete: ")) -> None:
    """
    Delete category by id

    Args:
        category_id (UUID): ID of category to delete
    """
    category_services = CategoryCRUD(db)
    result = await category_services.delete_category(category_id)
    return result

