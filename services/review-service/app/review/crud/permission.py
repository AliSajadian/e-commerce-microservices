from uuid import UUID 
import logging
from sqlite3 import IntegrityError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.exc import IntegrityError

from ..models import User, Permission
from ..exceptions import ObjectCreationError, ObjectVerificationError, ObjectNotFoundError


class PermissionCRUDs:
    """ ================== """
    """ Permissions API Services """
    """ ================== """
    async def add(self, db: AsyncSession, permission: Permission):
        """
        Create permission object
        """
        try:
            db.add(permission)
            await db.commit()
            await db.refresh(permission)
            
            logging.info(f"Created new permission.")
            return permission

        except ValidationError as e:
            logging.error(f"Failed to the permission data verification. Error: {str(e)}")
            await db.rollback()
            raise ObjectVerificationError("Permission", str(e))
        except IntegrityError as e:
            logging.error(f"Username already exists. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError("permission already exists.")
        except Exception as e:
            logging.error(f"Failed to create permission. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError(str(e))

    
    async def get_all(self, db: AsyncSession):
        """
        Get all Permissions objects from db
        """
        statement = select(Permission).order_by(Permission.id)
        result = await db.execute(statement)
        permissions = result.scalars().all()
        
        logging.info(f"Retrieved {len(permissions)} permissions.")
        return permissions


    async def get_by_id(
        self, async_session: AsyncSession, permission_id: int
    ):
        """
        Get permission by id
        """
        async with async_session as db:
            statement = select(Permission).filter(Permission.id == permission_id)
            
            result = await db.execute(statement)
            permission = result.scalars().one_or_none()
            
            if not permission:
                logging.warning(f"Permission {permission_id} not found.")
                raise ObjectNotFoundError(permission_id)
            
            logging.info(f"Retrieved permission {permission_id}.")
            return permission


    async def get_permissions(db: AsyncSession, user_id: UUID):
        user_stmt = select(User).filter(User.id == user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if not role:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                permissions.add(perm.name)
        return permissions
    

    async def update(
        self, db: AsyncSession, permission_id, data
    ):
        """
        Update Permission by id
        """
        statement = select(Permission).filter(Permission.id == permission_id)

        result = await db.execute(statement)
        permission = result.scalars().one_or_none()

        if not permission:
            logging.warning(f"Permission {permission_id} not found.")
            raise ObjectNotFoundError(permission_id)

        permission.name = data["name"]
        permission.code = data["code"]

        await db.commit()
        await db.refresh(permission)

        logging.info(f"Successfully updated permission {permission_id}.")
        return permission


    async def delete(self, db: AsyncSession, permission: Permission):
        """delete permission by id
        """
        await db.delete(permission)
        await db.commit()
        await db.refresh(permission)

        logging.info(f"Successfully deleted permission {permission.id}.")
        return {}
    
     