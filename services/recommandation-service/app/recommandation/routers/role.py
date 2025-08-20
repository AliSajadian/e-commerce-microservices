from http import HTTPStatus
from typing import List
from fastapi import APIRouter, Path
from uuid import UUID
from app.auth.crud import RoleCRUDs
from app.auth.models import Role

from ..schemas import RoleCreateModel, RoleModel
from ...api.dependencies.database import AsyncDbSession


""" ===================== """
""" Role router endpoints """
""" ===================== """
routers = APIRouter(
    # prefix="/",
    # tags=["roles"],
    # dependencies=[Depends(get_db)],
    # responses={404: {"description": "Not found"}},
)
role_services = RoleCRUDs()

@routers.post("", status_code=HTTPStatus.CREATED, response_model=RoleModel)
async def create_role(db: AsyncDbSession, role_data: RoleCreateModel):
    """API endpoint for creating a role resource

    Args:
        role_data (RoleCreateModel): data for creating a role using the role schema

    Returns:
        dict: role that has been created
    """
    new_role = Role(
        name=role_data.name
    )
    role = await role_services.add(db, new_role, role_data.permission_ids)
    return role


@routers.get("", response_model=List[RoleModel])
async def get_all_roles(db: AsyncDbSession):
    """API endpoint for listing all role resources
    """
    roles = await role_services.get_all(db)
    return [RoleModel.model_validate(role) for role in roles]


@routers.get("/{role_id}")
async def get_role_by_id(db: AsyncDbSession, 
    role_id: UUID = Path(..., description="The role id, you want to find: ", gt=0),
    # query_param: str = Query(None, max_length=5)
):
    """API endpoint for retrieving a role by its ID

    Args:
        role_id (UUID): the ID of the role to retrieve

    Returns:
        dict: The retrieved role
    """
    role = await role_services.get_by_id(db, role_id)
    return role


@routers.get("/{role_id}/permissions")
async def get_permissions_by_role_id(db: AsyncDbSession, 
    role_id: UUID = Path(..., description="The user id, you want to find: ", gt=0),
    # query_param: str = Query(None, max_length=5)
):
    """API endpoint for retrieving permissions by role ID

    Args:
        role_id (UUID): the ID of the role to retrieve

    Returns:
        dict: The retrieved permissions
    """
    permissions = await role_services.get_permissions_by_role_id(db, role_id)
    return permissions


@routers.patch("/{role_id}")
async def update_role(db: AsyncDbSession, role_data: RoleCreateModel,  
                      role_id: UUID = Path(..., description="The role id, you want to update: ")):
    """Update by ID

    Args:
        role_id (UUID): ID of role to update
        data (RoleCreateModel): data to update role

    Returns:
        dict: the updated role
    """
    role = await role_services.update(
        db, 
        role_id, 
        role_data,
        role_data.permission_ids
    )
    return role


@routers.delete("/{role_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_role(db: AsyncDbSession, role_id: UUID = Path(..., description="The role id, you want to delete: ")) -> None:
    """Delete role by id

    Args:
        role_id (UUID): ID of role to delete
    """
    role = await role_services.get_by_id(db, role_id)
    result = await role_services.delete(db, role)
    return result
