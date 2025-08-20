from http import HTTPStatus
from typing import List
import uuid
from fastapi import APIRouter, HTTPException, Path

from ..crud import TagCRUD
from ..schemas.tag import TagCreateSchema, TagUpdateSchema, TagSchema
from ...api.dependencies.database import AsyncDbSession

# ============================================================================
# Tag router endpoints
# ============================================================================

routers = APIRouter()

@routers.post("", status_code=HTTPStatus.CREATED)
async def create_tag(db: AsyncDbSession, tag_data: TagCreateSchema) -> TagSchema:
    """API endpoint for creating a tag resource

    Args:
        tag_data (TagCreateModel): data for creating a tag using the tag schema

    Returns:
        dict: tag that has been created
    """
    tag_services = TagCRUD(db)
    tag = await tag_services.create_tag(tag_data)
    return tag


@routers.get("", response_model=List[TagSchema])
async def get_all_tags(db: AsyncDbSession) -> List[TagSchema]:
    """API endpoint for listing all tag resources
    """
    tag_services = TagCRUD(db)
    tags = await tag_services.read_all_tags()
    return tags


@routers.get("/{tag_id}")
async def get_tag_by_id(db: AsyncDbSession, 
    tag_id: uuid.UUID = Path(..., description="The tag id, you want to find: "),
    # query_param: str = Query(None, max_length=5)
 ) -> TagSchema:
    """API endpoint for retrieving a tag by its ID

    Args:
        tag_id (int): the ID of the tag to retrieve

    Returns:
        dict: The retrieved tag
    """
    tag_services = TagCRUD(db)
    tag = await tag_services.read_tag_by_id(tag_id)
    return tag


@routers.patch("/{tag_id}")
async def update_tag(db: AsyncDbSession, data: TagUpdateSchema, tag_id: uuid.UUID = Path(..., description="The tag id, you want to update: ")) -> TagSchema:
    """Update by ID

    Args:
        tag_id (int): ID of tag to update
        data (TagCreateModel): data to update tag

    Returns:
        dict: the updated tag
    """
    tag_services = TagCRUD(db)
    tag = await tag_services.update_tag(
        tag_id, 
        data={
            "name": data.name
        }
    )
    return tag


@routers.delete("/{tag_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_tag(db: AsyncDbSession, tag_id: uuid.UUID = Path(..., description="The tag id, you want to delete: ")) -> None:
    """Delete tag by id

    Args:
        tag_id (str): ID of tag to delete
    """
    tag_services = TagCRUD(db)
    if not await tag_services.delete_tag(tag_id):
        raise HTTPException(status_code=404, detail="Tag not found")

