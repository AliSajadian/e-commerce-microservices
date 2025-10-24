from http import HTTPStatus
from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Path

from ..crud import TagCRUD
from ..schemas.tag import TagCreateSchema, TagUpdateSchema, TagSchema
from ...api.dependencies.database import get_tag_service
from app.utils.validation import safe_validate

# ============================================================================
# Tag router endpoints
# ============================================================================

routers = APIRouter()

@routers.post("", status_code=HTTPStatus.CREATED)
async def create_tag(
    tag_data: TagCreateSchema,
    tag_service: TagCRUD = Depends(get_tag_service)
) -> TagSchema:
    """API endpoint for creating a tag resource

    Args:
        tag_data (TagCreateModel): data for creating a tag using the tag schema

    Returns:
        dict: tag that has been created
    """
    return TagSchema.model_validate(await tag_service.create_tag(tag_data))

@routers.get("", response_model=List[TagSchema])
async def get_all_tags(
    tag_service: TagCRUD = Depends(get_tag_service)
) -> List[TagSchema]:
    """API endpoint for listing all tag resources
    """
    tags = await tag_service.read_all_tags()
    return [t for tag in tags if (t := safe_validate(TagSchema, tag))]

@routers.get("/{tag_id}")
async def get_tag_by_id(
    tag_service: TagCRUD = Depends(get_tag_service),
    tag_id: uuid.UUID = Path(..., description="The tag id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
 ) -> TagSchema:
    """API endpoint for retrieving a tag by its ID

    Args:
        tag_id (int): the ID of the tag to retrieve

    Returns:
        dict: The retrieved tag
    """
    return TagSchema.model_validate(await tag_service.read_tag_by_id(tag_id))

@routers.patch("/{tag_id}")
async def update_tag(
    data: TagUpdateSchema, 
    tag_service: TagCRUD = Depends(get_tag_service),
    tag_id: uuid.UUID = Path(..., description="The tag id, you want to update: ")
) -> TagSchema:
    """Update by ID

    Args:
        tag_id (int): ID of tag to update
        data (TagCreateModel): data to update tag

    Returns:
        dict: the updated tag
    """
    return TagSchema.model_validate(await tag_service.update_tag(
        tag_id, 
        data={
            "name": data.name
        }
    ))

@routers.delete("/{tag_id}", status_code=HTTPStatus.OK)
async def delete_tag(
    tag_service: TagCRUD = Depends(get_tag_service),
    tag_id: uuid.UUID = Path(..., description="The tag id, you want to delete: ")
) -> bool:
    """Delete tag by id

    Args:
        tag_id (str): ID of tag to delete
    """
    if not await tag_service.delete_tag(tag_id):
        raise HTTPException(status_code=404, detail="Tag not found")

