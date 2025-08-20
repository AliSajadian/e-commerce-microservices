from http import HTTPStatus
from typing import List
from uuid import UUID
from fastapi import APIRouter, Path

from ..crud import UserCRUDs
from ..schemas import UserCreateModel, UserModel
from ...api.dependencies.database import AsyncDbSession


""" ===================== """
""" User router endpoints """
""" ===================== """
routers = APIRouter(
    # prefix="/",
    # tags=["users"],
    # dependencies=[Depends(get_db)],
    # responses={404: {"description": "Not found"}},
)
user_services = UserCRUDs()

@routers.post("", status_code=HTTPStatus.CREATED, response_model=None)
async def create_user(db: AsyncDbSession, user_data: UserCreateModel):
    """API endpoint for creating a user resource

    Args:
        user_data (UserCreateModel): data for creating a user using the user schema

    Returns:
        dict: user that has been created
    """
    user = await user_services.add(db, user_data)
    return user


@routers.get("", response_model=List[UserModel])
async def get_all_users(db: AsyncDbSession):
    """API endpoint for listing all user resources
    """
    users = await user_services.get_all(db)
    return users


@routers.get("/{user_id}")
async def get_user_by_id(db: AsyncDbSession, 
    user_id: int = Path(..., description="The user id, you want to find: ", gt=0),
    # query_param: str = Query(None, max_length=5)
):
    """API endpoint for retrieving a user by its ID

    Args:
        user_id (int): the ID of the user to retrieve

    Returns:
        dict: The retrieved user
    """
    user = await user_services.get_by_id(db, user_id)
    return user


@routers.get("/{user_id}/roles")
async def get_roles_by_user_id(db: AsyncDbSession, 
    user_id: UUID = Path(..., description="The user id, you want to find: ", gt=0),
    # query_param: str = Query(None, max_length=5)
):
    """API endpoint for retrieving a user by its ID

    Args:
        user_id (int): the ID of the user to retrieve

    Returns:
        dict: The retrieved roles
    """
    roles = await user_services.get_roles_by_user_id(db, user_id)
    return roles


@routers.get("/{user_id}/permissions")
async def get_permissions_by_user_id(db: AsyncDbSession, 
    user_id: UUID = Path(..., description="The user id, you want to find: ", gt=0),
    # query_param: str = Query(None, max_length=5)
):
    """API endpoint for retrieving permissions by user ID

    Args:
        user_id (UUID): the ID of the user to retrieve

    Returns:
        dict: The retrieved permissions
    """
    permissions = await user_services.get_permissions_by_user_id(db, user_id)
    return permissions


@routers.patch("/{user_id}")
async def update_user(db: AsyncDbSession, data: UserCreateModel, 
                      user_id: UUID = Path(..., description="The user id, you want to update: ")):
    """Update by ID

    Args:
        user_id (UUID): ID of user to update
        data (UserCreateModel): data to update user

    Returns:
        dict: the updated user
    """
    user = await user_services.update(
        db, 
        user_id, 
        data={
            "username": data.username, 
            "first_name": data.first_name, 
            "last_name": data.last_name,
            "role_ids": data.role_ids
        }
    )
    return user


@routers.delete("/{user_id}", status_code=HTTPStatus.NO_CONTENT)
async def delete_user(db: AsyncDbSession, user_id: UUID = Path(..., description="The user id, you want to delete: ")) -> None:
    """Delete user by id

    Args:
        user_id (UUID): ID of user to delete
    """
    user = await user_services.get_by_id(db, user_id)
    result = await user_services.delete(db, user)
    return result
