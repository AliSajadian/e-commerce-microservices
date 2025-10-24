import logging
from uuid import UUID
from pydantic import ValidationError
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError, NoResultFound, SQLAlchemyError # Import SQLAlchemyError for broader DB errors
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas.user import UserCreateModel, UserModel, UserRoleUpdateModel, UserUpdateModel
from app.auth.crud.permission import PermissionCRUDs
from app.auth.models import User, Role
from app.auth.exceptions import ObjectAlreadyRegistered, ObjectCreationError, ObjectNotFoundError
from app.utilities.password_utils import get_password_hash
# from app.core.rabbitmq import publish_user_registered_event


class UserCRUDs:
    """ ================== """
    """ Users API Services """
    """ ================== """ 
    def __init__(self, db: AsyncSession):
        self.db = db


    async def get_by_username(
        self, username: str 
    ):
        """
        Get user by username
        """
        try:
            statement = select(User).filter(User.username == username)
            result = await self.db.execute(statement)        
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

        
    async def add(self, user_data: UserCreateModel):
        """
        Create user object
        """
        try:
            # 1. Check for existing user
            existing_user = await self.get_by_username(self.db, user_data.username)
            if existing_user:
                raise ObjectAlreadyRegistered("Username")
            
            # 2. Check if email already exists
            existing_email_user = await self.db.execute(
                select(User).where(User.email == user_data.email)
            )
            if existing_email_user.scalars().first():
                raise ValueError(f"User with email {user_data.email} already exists.")
        
            # 3. Find the roles
            roles = []
            if user_data.role_ids:
                roles_result = await self.db.execute(
                    select(Role).where(Role.id.in_(user_data.role_ids))
                )
                roles = roles_result.scalars().all()
                
                if len(roles) != len(user_data.role_ids):
                    missing_role_ids = set(user_data.role_ids) - set(r.id for r in roles)
                    logging.warning(f"Some specified role IDs not found: {list(missing_role_ids)}")
                    # You might want to raise an exception here instead of continuing
                    # raise ObjectVerificationError(f"One or more role IDs not found: {list(missing_role_ids)}")

            # 4. Create the new user object
            user = User(
                username=user_data.username, 
                first_name=user_data.first_name, 
                last_name=user_data.last_name, 
                email=user_data.email,
                avatar=user_data.avatar,
                preferred_language=user_data.preferred_language,
                timezone=user_data.timezone,
                password_hash=get_password_hash(user_data.password),
                roles=roles  # Assign roles directly on creation
            )
            
            # 5. Add to session and commit
            self.db.add(user)
            await self.db.commit()
            
            # 6. Refresh to get the final state from the database
            await self.db.refresh(user)
            
            # 7. Eagerly load roles for the final return model
            user_with_roles = await self.db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(User.id == user.id)
            )
            final_user = user_with_roles.scalars().first()
            
            if not final_user:
                raise ObjectCreationError("Failed to retrieve user after creation.")
            
            logging.info(f"Created new user with ID: {final_user.id}")
            
            # --- Publish RabbitMQ Event ---
            # if publish_user_registered_event: # Check if it's imported and callable
            #     await publish_user_registered_event(
            #         user_id=user_response_dict["id"],
            #         email=user_response_dict["username"], # Assuming username acts as email for simplicity
            #         username=user_response_dict["username"]
            #     )
            # --- END RabbitMQ ---
            
            # 8. Convert to Pydantic model for response
            return UserModel.from_orm(final_user)
            
        except ObjectAlreadyRegistered as e:
            logging.warning(f"User creation failed (Conflict): {e.detail}")
            await self.db.rollback()
            raise e

        except IntegrityError as e:
            logging.error(f"Database integrity error during user creation. Error: {str(e)}", exc_info=True)
            await self.db.rollback()
            raise ObjectAlreadyRegistered("Username") if "duplicate key" in str(e).lower() and "username" in str(e).lower() else ObjectCreationError(f"Database integrity error: {e}") from e

        except SQLAlchemyError as e:
            logging.error(f"A SQLAlchemy error occurred during user creation. Error: {e}", exc_info=True)
            await self.db.rollback()
            raise ObjectCreationError(f"Database operation failed: {e}") from e

        except Exception as e:
            logging.error(f"An unexpected error occurred during user creation. Error: {e}", exc_info=True)
            await self.db.rollback()
            raise ObjectCreationError(f"An internal server error occurred: {e}") from e


    async def get_all(self):
        """
        Get all users objects from db
        """
        statement = select(User).order_by(User.id)

        result = await self.db.execute(statement)
        users = result.scalars().all()
        
        logging.info(f"Retrieved {len(users)} users.")
        return users


    async def get_by_id(
        self, user_id: UUID
    ):
        """
        Get user by id
        """
        try:
            statement = select(User).filter(User.id == user_id)
            result = await self.db.execute(statement)           
            user = result.scalars().one()
            logging.info(f"Retrieved user {user_id}.")
            return user
        except NoResultFound:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
             

    async def get_roles_by_user_id(
        self, user_id: UUID
    ):
        """
        Get user by id
        """
        # First check if the user exists
        user_stmt = select(User).filter(User.id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if not user:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        # User exists, now get roles
        user_result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles))
            .filter(User.id == user_id)
        )
        user = user_result.scalars().one()
        roles = user.roles
        
        logging.info(f"Retrieved {len(roles)} roles of user {user_id}.")
        return roles
            

    async def get_permissions_by_user_id(
        self, user_id: UUID
    ):
        """
        Get user by id
        """
        # First check if the user exists
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            logging.warning(f"User with id {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        # User exists, now get permissions
        user_result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.roles)
                .selectinload(Role.permissions)
            )
            .filter(User.id == user_id)
        )
        user = user_result.scalars().one_or_none()
        permissions = set()
        if user:
            for role in user.roles:
                permissions.update(role.permissions)
        
        logging.info(f"Retrieved {len(permissions)} roles of user {user_id}.")
        return permissions


    async def update(
        self, user_id: UUID, data: UserUpdateModel
    ):
        """
        Update User by id (includes roles, excludes password)
        """
        user = await self.get_by_id(user_id)
        
        if not user:
            logging.warning(f"User {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        # Only update fields that are provided (not None)
        update_data = data.model_dump(exclude_unset=True)
        
        # Handle role updates separately
        if 'role_ids' in update_data:
            role_ids = update_data.pop('role_ids')
            if role_ids:  # Only update if role_ids is provided and not empty
                # Verify roles exist
                role_statement = select(Role).filter(Role.id.in_(role_ids))
                role_result = await self.db.execute(role_statement)
                roles = role_result.scalars().all()
                
                if len(roles) != len(role_ids):
                    raise ValueError("One or more role IDs are invalid")
                
                user.roles = roles
        
        # Update other fields
        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logging.info(f"Successfully updated user {user_id}.")
        return user

    # NEW: Separate method for updating user roles (admin only)
    async def update_user_roles(
        self, user_id: UUID, role_data: UserRoleUpdateModel
    ):
        """
        Update user roles (admin endpoint)
        """
        statement = select(User).filter(User.id == user_id)
        
        result = await self.db.execute(statement)
        user = result.scalar_one_or_none()
        
        if not user:
            logging.warning(f"User {user_id} not found.")
            raise ObjectNotFoundError(user_id)
        
        # Verify roles exist
        role_statement = select(Role).filter(Role.id.in_(role_data.role_ids))
        role_result = await self.db.execute(role_statement)
        roles = role_result.scalars().all()
        
        if len(roles) != len(role_data.role_ids):
            raise ValueError("One or more role IDs are invalid")
        
        # Update user roles
        user.roles = roles
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logging.info(f"Successfully updated roles for user {user_id}.")
        return user


    async def delete(self, user_id: UUID):
        """
          delete user by id
        """
        # 1. Fetch the user with their roles loaded
        # 'selectinload' tells SQLAlchemy to load the roles in the same query
        stmt = select(User).options(selectinload(User.roles)).where(User.id == user_id)
        user = (await self.db.execute(stmt)).scalar_one_or_none()
        
        if not user:
            return False

        # 2. Clear the roles relationship (SQLAlchemy handles deleting the association rows)
        user.roles.clear()

        # 3. Delete the user object itself
        await self.db.delete(user)

        # 4. Commit the changes
        await self.db.commit()

        logging.info(f"Successfully deleted user {user_id}.")
        return True


       