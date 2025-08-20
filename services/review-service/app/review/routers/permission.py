from http import HTTPStatus
from typing import List
from uuid import UUID
from fastapi import APIRouter, Path

from ..crud import PermissionCRUDs
from ..models import Permission
from ..schemas import PermissionCreateModel, PermissionModel
from ...api.dependencies.database import AsyncDbSession


""" ===================== """
""" Permission router endpoints """
""" ===================== """
routers = APIRouter(
    # prefix="/",
    # tags=["permissions"],
    # dependencies=[Depends(get_db)],
    # responses={404: {"description": "Not found"}},
)
permission_services = PermissionCRUDs()

@routers.post("", status_code=HTTPStatus.CREATED, response_model=PermissionModel)
async def create_permission(db: AsyncDbSession, permission_data: PermissionCreateModel):
    """API endpoint for creating a permission resource

    Args:
        permission_data (PermissionCreateModel): data for creating a permission using the permission schema

    Returns:
        dict: permission that has been created
    """
    new_permission = Permission(
        name=permission_data.name
    )
    permission = await permission_services.add(db, new_permission)
    return PermissionModel.model_validate(permission)


@routers.get("", response_model=List[PermissionModel])
async def get_all_permissions(db: AsyncDbSession):
    """API endpoint for listing all permission resources
    """
    permissions = await permission_services.get_all(db)
    return [PermissionModel.model_validate(b) for b in permissions]


@routers.get("/{permission_id}")
async def get_by_id(db: AsyncDbSession, 
    permission_id: UUID = Path(..., description="The permission id, you want to find: ", gt=0),
    # query_param: str = Query(None, max_length=5)
):
    """API endpoint for retrieving a permission by its ID

    Args:
        permission_id (UUID): the ID of the permission to retrieve

    Returns:
        dict: The retrieved permission
    """
    permission = await permission_services.get_by_id(db, permission_id)
    return permission


@routers.patch("/{permission_id}")
async def update_permission(db: AsyncDbSession, data: PermissionCreateModel, 
                      permission_id: UUID = Path(..., description="The permission id, you want to update: ")):
    """Update by ID

    Args:
        permission_id (UUID): ID of permission to update
        data (PermissionCreateModel): data to update permission

    Returns:
        dict: the updated permission
    """
    permission = await permission_services.update(
        db, 
        permission_id, 
        data={
            "name": data.name
        }
    )
    return permission


@routers.delete("/{permission_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_permission(db: AsyncDbSession, permission_id: UUID = Path(..., description="The permission id, you want to delete: ")) -> None:
    """Delete permission by id

    Args:
        permission_id (UUID): ID of permission to delete
    """
    permission = await permission_services.get_by_id(db, permission_id)
    result = await permission_services.delete(db, permission)
    return result
