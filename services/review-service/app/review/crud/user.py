import logging
from uuid import UUID
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError, NoResultFound, SQLAlchemyError # Import SQLAlchemyError for broader DB errors
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas.role import RoleModel
from app.auth.schemas.user import UserCreateModel, UserModel
from app.auth.crud.permission import PermissionCRUDs
from app.auth.models import User, Role
from app.auth.exceptions import ObjectAlreadyRegistered, ObjectCreationError, ObjectVerificationError, ObjectNotFoundError
from app.utilities.password_utils import get_password_hash
from app.core.rabbitmq import publish_user_registered_event


class UserCRUDs:
    """ ================== """
    """ Users API Services """
    """ ================== """ 
    async def add1(self, db: AsyncSession, user_data: UserCreateModel):
        """
        Create role object
        """
        try:
            existing_user = await self.get_by_username(db, user_data.username)
            if existing_user:
                raise ObjectAlreadyRegistered("Username")
        
            user = User(
                username=user_data.username, 
                first_name=user_data.first_name, 
                last_name=user_data.last_name, 
                password_hash=get_password_hash(user_data.password)
            )
            
            role_ids=user_data.role_ids
            
            db.add(user)
            # await db.flush()        
            
            if role_ids:
                roles_result = await db.execute(
                    select(Role).where(Role.id.in_(role_ids))
                )
                roles = roles_result.scalars().all()
                # Now reload the role from the session to ensure it's attached
                statement = select(User).where(User.id == user.id)

                result = await db.execute(statement)
                attached_user = result.scalars().first()
                attached_user.roles = roles

                # Use attached_role for further operations
                await db.commit()
                await db.refresh(attached_user)

                # Eagerly load roles
                statement = (
                    select(User)
                    .options(selectinload(User.roles))
                    .where(User.id == attached_user.id)
                )

                result = await db.execute(statement)
                user_with_roles = result.scalars().first()
            else:

                await db.commit()
                await db.refresh(user)
                # Eagerly load roles
                statement = (
                    select(User)
                    .options(selectinload(User.roles))
                    .where(User.id == user.id)
                )

                result = await db.execute(statement)
                user_with_roles = result.scalars().first()

            # Force loading all role fields (no lazy loading later)
            _ = [p.id for p in user_with_roles.roles]
        
            logging.info(f"Created new user.")
            
            for p in user_with_roles.roles:
                print(f"Role: id={p.id}, name={p.name}, description={p.description}")
                
            # return RoleModel.model_validate(role_with_roles)
            # roles_data = [
            #     # PermissionModel.model_validate(p) 
            #     {
            #         "id": str(p.id),
            #         "name": p.name,
            #         "description": p.description
            #     }
            #     for p in user_with_roles.roles
            #     # PermissionModel(id=p.id, name=p.name, description=p.description)
            #     # for p in role_with_roles.roles
            # ]
            roles_data = [
                RoleModel(
                    id=p.id,
                    name=p.name,
                    description=p.description
                )
                for p in user_with_roles.roles
            ]
            user_data = {
                "id": str(user_with_roles.id),
                "first_name": user_with_roles.first_name,
                "last_name": user_with_roles.last_name,
                "username": user_with_roles.username,
                # "password_hash": user_with_roles.password_hash,
                "roles": roles_data
            }
            
            # --- NEW: Publish RabbitMQ Event ---
            if user_data:
                await publish_user_registered_event(
                    user_id=str(user_data.id),
                    email=user_data.username, # Assuming username acts as email for simplicity
                    username=user_data.username
                )
            # --- END NEW ---
            
            return UserModel(**user_data)
            # return RoleModel(**user_data)


        except ValidationError as e:
            logging.error(f"Failed to the user data verification. Error: {str(e)}")
            await db.rollback()
            raise ObjectVerificationError("User", str(e))
        except IntegrityError as e:
            logging.error(f"Username already exists. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError("Username already exists.")
        except Exception as e:
            logging.error(f"Failed to create user. Error: {str(e)}")
            await db.rollback()
            raise ObjectCreationError(str(e))
    
    async def add(self, db: AsyncSession, user_data: UserCreateModel):
        """
        Create user object
        """
        try:
            existing_user = await self.get_by_username(db, user_data.username)
            if existing_user:
                raise ObjectAlreadyRegistered("Username")
        
            user = User(
                username=user_data.username, 
                first_name=user_data.first_name, 
                last_name=user_data.last_name, 
                password_hash=get_password_hash(user_data.password)
            )
            
            db.add(user)
            await db.flush() # Flush to get user.id before commit, needed for relationship if not using explicit commit
            
            if user_data.role_ids:
                roles_result = await db.execute(
                    select(Role).where(Role.id.in_(user_data.role_ids))
                )
                roles = roles_result.scalars().all()
                
                # Optional: Add a check if all role_ids were found
                if len(roles) != len(user_data.role_ids):
                    missing_role_ids = set(user_data.role_ids) - set(r.id for r in roles)
                    logging.warning(f"Some specified role IDs not found: {list(missing_role_ids)}")
                    # You might choose to raise an error here if missing roles should prevent user creation
                    # raise ObjectVerificationError("Roles", f"One or more role IDs not found: {list(missing_role_ids)}")

                user.roles = roles # Assign roles directly to the user object in the session
            
            await db.commit() # Commit changes to the database
            await db.refresh(user) # Refresh user object to load its new state, including relationship data if needed

            # Eagerly load roles for the final return if not already loaded by refresh
            user_with_roles = await db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(User.id == user.id)
            )
            user_with_roles = user_with_roles.scalars().first()
            
            if not user_with_roles: # Should ideally not happen if commit and refresh succeeded
                raise ObjectCreationError("Failed to retrieve user after creation for final processing.")

            # Force loading all role fields (no lazy loading later) - good for Pydantic serialization
            _ = [p.id for p in user_with_roles.roles] 
            
            logging.info(f"Created new user with ID: {user_with_roles.id}")
            
            for p in user_with_roles.roles:
                print(f"Role: id={p.id}, name={p.name}, description={p.description}")
                
            roles_data = [
                RoleModel(
                    id=p.id,
                    name=p.name,
                    description=p.description
                )
                for p in user_with_roles.roles
            ]
            
            user_response_dict = { # Renamed variable to avoid confusion with `user_data` arg
                "id": str(user_with_roles.id),
                "first_name": user_with_roles.first_name,
                "last_name": user_with_roles.last_name,
                "username": user_with_roles.username,
                "roles": roles_data
            }
            
            # --- Publish RabbitMQ Event ---
            if publish_user_registered_event: # Check if it's imported and callable
                await publish_user_registered_event(
                    user_id=user_response_dict["id"],
                    email=user_response_dict["username"], # Assuming username acts as email for simplicity
                    username=user_response_dict["username"]
                )
            # --- END RabbitMQ ---
            
            return UserModel(**user_response_dict)


        except ObjectAlreadyRegistered as e: # Catch your custom exception first
            logging.warning(f"User creation failed (Conflict): {e.detail}")
            await db.rollback()
            raise e # Re-raise the already created HTTPException

        except IntegrityError as e:
            logging.error(f"Database integrity error during user creation. Error: {str(e)}", exc_info=True)
            await db.rollback()
            # Check for specific integrity errors if possible (e.g., unique constraint violation for username)
            if "duplicate key value violates unique constraint" in str(e).lower() and "username" in str(e).lower():
                raise ObjectAlreadyRegistered("Username")
            raise ObjectCreationError(f"Database integrity error: {e}") from e # Propagate as a proper exception

        except NoResultFound as e: # This might occur if related roles are not found unexpectedly
            logging.error(f"No result found during user creation related operations. Error: {str(e)}", exc_info=True)
            await db.rollback()
            raise ObjectCreationError(f"Related data not found during user creation: {e}") from e

        except ValidationError as e:
            logging.error(f"Failed to validate user data. Error: {e.errors()}", exc_info=True)
            await db.rollback()
            # Raise ObjectVerificationError with the Pydantic error details
            raise ObjectVerificationError("User", str(e.errors())) # e.errors() provides more structured details

        except SQLAlchemyError as e: # Catch general SQLAlchemy errors
            logging.error(f"A SQLAlchemy error occurred during user creation. Error: {e}", exc_info=True)
            await db.rollback()
            raise ObjectCreationError(f"Database operation failed: {e}") from e

        except Exception as e:
            logging.error(f"An unexpected error occurred during user creation. Error: {e}", exc_info=True)
            await db.rollback()
            # THIS IS THE CRITICAL FIX: Raise an instance of your custom exception, not a string
            raise ObjectCreationError(f"An internal server error occurred: {e}") from e


    async def get_all(self, db: AsyncSession):
        """
        Get all users objects from db
        """
        statement = select(User).order_by(User.id)

        result = await db.execute(statement)
        users = result.scalars().all()
        
        logging.info(f"Retrieved {len(users)} users.")
        return users


    async def get_by_id(
        self, db: AsyncSession, user_id: UUID
    ):
        """
        Get user by id
        """
        try:
            statement = select(User).filter(User.id == user_id)
            result = await db.execute(statement)           
            user = result.scalars().one()
            logging.info(f"Retrieved user {user_id}.")
            return user
        except NoResultFound:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
             

    async def get_by_username(
        self, db: AsyncSession, username: str 
    ):
        """
        Get user by username
        """
        try:
            statement = select(User).filter(User.username == username)
            result = await db.execute(statement)        
            user = result.scalars().one_or_none() 
            
            if user:
                logging.info(f"Retrieved user {username}.")
                return user
            else:
                logging.warning(f"User with username {username} not found.")
                return None # 
        except Exception as e: # Catch any unexpected errors during DB query
            logging.error(f"Error fetching user by username '{username}': {e}", exc_info=True)
            raise ObjectCreationError(f"Database error checking for existing user: {e}") from e # Re-raise as a proper HTTPException


    async def get_roles_by_user_id(
        self, db: AsyncSession, user_id: UUID
    ):
        """
        Get user by id
        """
        # First check if the user exists
        user_stmt = select(User).filter(User.id == user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if not user:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        # User exists, now get roles
        roles_result = await db.execute(
                    select(Role)
                    .options(selectinload(User.roles))
                    .filter(Role.user_id == user_id)
                    .order_by(Role.id))
        roles = roles_result.scalars().all()
        
        logging.info(f"Retrieved {len(roles)} roles of user {user_id}.")
        return roles
            

    async def get_permissions_by_user_id(
        self, db: AsyncSession, user_id: UUID
    ):
        """
        Get user by id
        """
        # First check if the user exists
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        # User exists, now get permissions
        permissions = PermissionCRUDs().get_permissions(user)
        
        logging.info(f"Retrieved {len(permissions)} roles of user {user_id}.")
        return permissions


    async def update(
        self, db: AsyncSession, user_id: UUID, data
    ):
        """
        Update User by id
        """
        statement = select(User).filter(User.id == user_id)

        result = await db.execute(statement)
        user = result.scalars().scalar_one_or_none()

        if not user:
            logging.warning(f"User {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        user.name = data["name"]
        user.username = data["username"]

        await db.commit()
        await db.refresh(user)

        logging.info(f"Successfully updated user {user_id}.")
        return user


    async def delete(self, db: AsyncSession, user: User):
        """delete user by id
        """
        await db.delete(user)
        await db.commit()
        await db.refresh(user)

        logging.info(f"Successfully deleted user {user.id}.")
        return {}
       