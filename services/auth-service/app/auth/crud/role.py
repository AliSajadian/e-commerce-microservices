from uuid import UUID
import logging
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Role, Permission
from ..schemas.role import RoleCreateModel, RoleModel
from ..exceptions import ObjectAlreadyRegistered, ObjectCreationError, ObjectVerificationError, ObjectNotFoundError


class RoleCRUDs:
    """ ================== """
    """ Roles API Services """
    """ ================== """
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
        
        
    async def add2(self, db: AsyncSession, role: Role, permission_ids=None):
        """
        Create role object with permissions
        """
        try:
            # Add role to session
            db.add(role)
            await db.flush()  # Assigns an ID to the role

            if permission_ids:
                permissions_result = await db.execute(
                    select(Permission).where(Permission.id.in_(permission_ids))
                )
                permissions = permissions_result.scalars().all()
                role.permissions = permissions

            await db.commit()

            # Now re-query the role with eager loading
            result = await db.execute(
                select(Role)
                .options(selectinload(Role.permissions))
                .where(Role.id == role.id)
            )
            role_with_permissions = result.scalars().first()

            # Eagerly load permissions WHILE SESSION IS OPEN
            permissions_data = [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "description": p.description
                }
                for p in role_with_permissions.permissions  # <--- use role, not role_with_permissions
            ]

            role_data = {
                "id": str(role.id),
                "name": role.name,
                "permissions": permissions_data
            }

            return RoleModel(**role_data)

        except ValidationError as e:
            logging.error(f"Failed role data verification. Error: {str(e)}")
            await db.rollback()
            raise ObjectVerificationError("Role", str(e))
        except IntegrityError as e:
            logging.error(f"Role already exists. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError("Role already exists.")
        except Exception as e:
            logging.error(f"Failed to create role. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError(str(e))
    
    
    async def get_by_role_name(
        self, db: AsyncSession, name: str 
    ):
        """
        Get role by name
        """
        try:
            statement = select(Role).filter(Role.name == name)
            result = await db.execute(statement)        
            role = result.scalars().one_or_none() 
            
            if role:
                logging.info(f"Retrieved role {name}.")
                return role
            else:
                logging.warning(f"User with name {name} not found.")
                return None 
        except Exception as e: # Catch any unexpected errors during DB query
            logging.error(f"Error fetching role by name '{name}': {e}", exc_info=True)
            raise ObjectCreationError(f"Database error checking for existing role: {e}") from e # Re-raise as a proper HTTPException

    
    async def add(self, db: AsyncSession, role_data: RoleCreateModel):
        """
        Create role object with permissions
        """
        try:
            # 1. Check for existing user
            existing_role = await self.get_by_role_name(db, role_data.name)
            if existing_role:
                raise ObjectAlreadyRegistered("role name")

            # 1. Find permissions
            permissions = []
            if role_data.permission_ids:
                permissions_result = await db.execute(
                    select(Permission).where(Permission.id.in_(role_data.permission_ids))
                )
                permissions = permissions_result.scalars().all()
                # Optionally check for missing IDs
            
            # 2. Create the new role object
            role = Role(
                name=role_data.name,
                permissions=permissions  # Assign directly in constructor
            )
            
            # 3. Add to session and commit
            db.add(role)
            await db.commit()
            
            # 4. Refresh to get the final state from the DB
            await db.refresh(role)
            
            # 5. Eagerly load permissions for the final return model
            role_with_permissions = await db.execute(
                select(Role)
                .options(selectinload(Role.permissions))
                .where(Role.id == role.id)
            )
            final_role = role_with_permissions.scalars().first()
            
            if not final_role:
                raise ObjectCreationError("Failed to retrieve role after creation.")
            
            logging.info(f"Created new role with ID: {final_role.id}")
            
            # 6. Convert to Pydantic model for response
            return RoleModel.model_validate(final_role)
            
        except IntegrityError as e:
            logging.error(f"Role creation failed due to integrity error: {e}")
            await db.rollback()
            raise ObjectCreationError("Role already exists.")
        except SQLAlchemyError as e:
            logging.error(f"A SQLAlchemy error occurred during role creation. Error: {e}", exc_info=True)
            await db.rollback()
            raise ObjectCreationError(f"Database operation failed: {e}") from e
        except Exception as e:
            logging.error(f"An unexpected error occurred during role creation. Error: {e}", exc_info=True)
            await db.rollback()
            raise ObjectCreationError(f"An internal server error occurred: {e}") from e
    
    
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


    async def delete(self, db: AsyncSession, role_id: UUID):
        # 1. Fetch the role with their permissions loaded
        # 'selectinload' tells SQLAlchemy to load the permissions in the same query
        stmt = select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
        role = (await db.execute(stmt)).scalar_one_or_none()
        
        if not role:
            return False

        # 2. Clear the permissions relationship (SQLAlchemy handles deleting the association rows)
        role.permissions.clear()

        # 3. Delete the role object itself
        await db.delete(role)

        # 4. Commit the changes
        await db.commit()

        logging.info(f"Successfully deleted role {role_id}.")
        return True

    
  