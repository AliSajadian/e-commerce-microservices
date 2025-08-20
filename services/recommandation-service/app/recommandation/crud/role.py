from uuid import UUID
import logging
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import NoResultFound, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Role, Permission
from ..schemas.role import RoleModel
from ..exceptions import ObjectCreationError, ObjectVerificationError, ObjectNotFoundError
# from sqlalchemy.exc import IntegrityError


class RoleCRUDs:
    """ ================== """
    """ Roles API Services """
    """ ================== """
    async def add(self, db: AsyncSession, role: Role, permission_ids=None):
        """
        Create role object
        """
        try:
            db.add(role)
            await db.flush()        
            
            if permission_ids:
                permissions_result = await db.execute(
                    select(Permission).where(Permission.id.in_(permission_ids))
                )
                permissions = permissions_result.scalars().all()
                # Now reload the role from the session to ensure it's attached
                statement = select(Role).where(Role.id == role.id)

                result = await db.execute(statement)
                attached_role = result.scalars().first()
                attached_role.permissions = permissions

                # Use attached_role for further operations
                await db.commit()
                await db.refresh(attached_role)

                # Eagerly load permissions
                statement = (
                    select(Role)
                    .options(selectinload(Role.permissions))
                    .where(Role.id == attached_role.id)
                )

                result = await db.execute(statement)
                role_with_permissions = result.scalars().first()                

            else:  
                await db.commit()
                await db.refresh(role)
                # Eagerly load permissions
                statement = (
                    select(Role)
                    .options(selectinload(Role.permissions))
                    .where(Role.id == role.id)
                )

                result = await db.execute(statement)
                role_with_permissions = result.scalars().first()
                
            # Force loading all permission fields (no lazy loading later)
            _ = [p.id for p in role_with_permissions.permissions]
        
            logging.info(f"Created new role.")
            # return RoleModel.model_validate(role_with_permissions)
            permissions_data = [
                # PermissionModel.model_validate(p) 
                {
                    "id": str(p.id),
                    "name": p.name,
                    "description": p.description
                }
                for p in role_with_permissions.permissions
                # PermissionModel(id=p.id, name=p.name, description=p.description)
                # for p in role_with_permissions.permissions
            ]

            role_data = {
                "id": str(role_with_permissions.id),
                "name": role_with_permissions.name,
                "permissions": permissions_data
            }
            
            return RoleModel(**role_data)

        except ValidationError as e:
            logging.error(f"Failed to the role data verification. Error: {str(e)}")
            await db.rollback()
            raise ObjectVerificationError("Role", str(e))
        except IntegrityError as e:
            logging.error(f"This role already exists. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError("Role already exists.")
        except Exception as e:
            logging.error(f"Failed to create role. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError(str(e))
        
        
    async def add1(self, db: AsyncSession, role: Role, permission_ids=None):
        """
        Create role object
        """
        try:
            db.add(role)
            await db.flush()
            
            if permission_ids:
                permissions_result = await db.execute(
                    select(Permission).where(Permission.id.in_(permission_ids))
                )
                permissions = permissions_result.scalars().all()
                
                # Now reload the role from the session to ensure it's attached
                statement = select(Role).where(Role.id == role.id)
                result = await db.execute(statement)
                attached_role = result.scalars().first()
                attached_role.permissions = permissions
                attached_role.permissions = permissions  # assign the fully loaded list here

            await db.commit()

            await db.refresh(role)
            
            # Eagerly load permissions to avoid lazy loading outside session
            statement = (
                select(Role).
                options(selectinload(Role.permissions)).
                where(Role.id == attached_role.id)
            )
            result = await db.execute(statement)
            role_with_permissions = result.scalars().first()
                        
            # Force loading all permission fields (no lazy loading later)
            _ = [p.id for p in role_with_permissions.permissions]
        
            logging.info(f"Created new role.")
            # return RoleModel.model_validate(role_with_permissions)
            permissions_data = [
                # PermissionModel.model_validate(p) 
                {
                    "id": str(p.id),
                    "name": p.name,
                    "description": p.description
                }
                for p in role_with_permissions.permissions
                # PermissionModel(id=p.id, name=p.name, description=p.description)
                # for p in role_with_permissions.permissions
            ]

            role_data = {
                "id": str(role_with_permissions.id),
                "name": role_with_permissions.name,
                "permissions": permissions_data
            }
            return RoleModel(**role_data)

        except ValidationError as e:
            logging.error(f"Failed to the role data verification. Error: {str(e)}")
            await db.rollback()
            raise ObjectVerificationError(str(e))
        except Exception as e:
            logging.error(f"Failed to create role. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError(str(e))
    
    
    async def get_all(self, db: AsyncSession):
        """
        Get all Roles objects from db
        """
        statement = select(Role).order_by(Role.id)
        result = await db.execute(statement)
        roles = result.scalars().all()
        
        logging.info(f"Retrieved {len(roles)} roles.")
        return roles


    async def get_by_id(
        self, async_session: AsyncSession, role_id: int
    ):
        """
        Get role by id
        """
        async with async_session as db:
            statement = select(Role).filter(Role.id == role_id)
            
            result = await db.execute(statement)
            role = result.scalars().one_or_none()
            
            if not role:
                logging.warning(f"Role {role_id} not found.")
                raise ObjectNotFoundError(role_id)
            
            logging.info(f"Retrieved role {role_id}.")
            return role


    async def get_permissions_by_role_id(
        self, db: AsyncSession, role_id: UUID
    ):
        """
        Get permission by id
        """
        # First check if the role exists
        role_stmt = select(Role).filter(Role.id == role_id)
        role_result = await db.execute(role_stmt)
        role = role_result.scalar_one_or_none()

        if not role:
            logging.warning(f"Permission with id {role_id} not found.")
            raise ObjectNotFoundError(role_id)
        
        # Permission exists, now get roles
        permissions_result = await db.execute(select(Permission)
                    .options(selectinload(Role.permissions))
                    .filter(Permission.role_id == role_id)
                    .order_by(Permission.id))
        permissions = permissions_result.scalars().all()
        
        logging.info(f"Retrieved {len(permissions)} permissions of role {role_id}.")
        return permissions


    async def update(
        self, db: AsyncSession, role_id, data, permission_ids=None
    ):
        """
        Update Role by id
        """
        statement = select(Role).filter(Role.id == role_id)

        result = await db.execute(statement)
        role = result.scalars().one_or_none()

        if not role:
            logging.warning(f"Role {role_id} not found.")
            raise ObjectNotFoundError(role_id)

        if hasattr(data, "dict"):
            data = data.dict(exclude_unset=True)
            
        # Update role fields
        if "name" in data and data["name"] is not None:
            role.name = data["name"]
            name = data["name"]
            print(f"@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Name: {name}")
            
        if "description" in data and data["name"] is not None:
            role.description = data["description"]
            
        # Update permissions if provided
        if permission_ids:
            permissions_result = await db.execute(
                select(Permission).where(Permission.id.in_(permission_ids))
            )
            permissions = permissions_result.scalars().all()
            role.permissions = permissions

        await db.commit()
        await db.refresh(role)

        # Eagerly load permissions
        statement = (
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.id == role.id)
        )
        result = await db.execute(statement)
        role_with_permissions = result.scalars().first()

        logging.info(f"Successfully updated role {role_id}.")
        return role_with_permissions


    async def delete(self, db: AsyncSession, role: Role):
        """delete role by id
        """
        await db.delete(role)
        await db.commit()
        await db.refresh(role)

        logging.info(f"Successfully deleted role {role.id}.")
        return {}
    
  